# Databricks notebook source
# COMMAND ----------
# MAGIC %md
# MAGIC # 03 — Layout Analyzer
# MAGIC Use Azure Document Intelligence to extract bounding boxes from each page.
# MAGIC Cross-reference with exam template answer zones and crop each answer region.

# COMMAND ----------

import io
import json
import uuid
from datetime import datetime
from PIL import Image
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from azure.storage.filedatalake import DataLakeServiceClient
from azure.cosmos import CosmosClient

# COMMAND ----------

dbutils.widgets.text("exam_id", "")
dbutils.widgets.text("batch_id", "")
dbutils.widgets.text("tenant_id", "")
dbutils.widgets.text("storage_account_name", "")
dbutils.widgets.text("cosmos_endpoint", "")
dbutils.widgets.text("doc_intelligence_endpoint", "")
dbutils.widgets.text("correlation_id", "")

exam_id = dbutils.widgets.get("exam_id")
batch_id = dbutils.widgets.get("batch_id")
tenant_id = dbutils.widgets.get("tenant_id")
storage_account_name = dbutils.widgets.get("storage_account_name")
cosmos_endpoint = dbutils.widgets.get("cosmos_endpoint")
doc_intelligence_endpoint = dbutils.widgets.get("doc_intelligence_endpoint")
correlation_id = dbutils.widgets.get("correlation_id")

# COMMAND ----------

def get_clients():
    storage_key = dbutils.secrets.get(scope="markflow", key="storage-account-key")
    cosmos_key = dbutils.secrets.get(scope="markflow", key="cosmos-key")
    di_key = dbutils.secrets.get(scope="markflow", key="doc-intelligence-key")

    datalake = DataLakeServiceClient(
        account_url=f"https://{storage_account_name}.dfs.core.windows.net",
        credential=storage_key,
    )
    cosmos_client = CosmosClient(cosmos_endpoint, cosmos_key)
    db = cosmos_client.get_database_client("markflow")

    doc_intel = DocumentAnalysisClient(
        endpoint=doc_intelligence_endpoint,
        credential=AzureKeyCredential(di_key),
    )

    return datalake, db, doc_intel

datalake, cosmos_db, doc_intel_client = get_clients()
exams_container = cosmos_db.get_container_client("exams")
submissions_container = cosmos_db.get_container_client("submissions")
results_container = cosmos_db.get_container_client("grading-results")

# COMMAND ----------

# Load the exam template to get expected answer zones
exam_query = f"SELECT * FROM c WHERE c.id = '{exam_id}' AND c.tenantId = '{tenant_id}'"
exam_templates = list(exams_container.query_items(exam_query, enable_cross_partition_query=True))

if not exam_templates:
    dbutils.notebook.exit(json.dumps({"error": f"Exam template {exam_id} not found"}))

exam_template = exam_templates[0]
questions_by_page = {}
for q in exam_template.get("questions", []):
    page = q["boundingBox"]["page"]
    if page not in questions_by_page:
        questions_by_page[page] = []
    questions_by_page[page].append(q)

print(f"Exam template loaded: {len(exam_template.get('questions', []))} questions across {len(questions_by_page)} pages")

# COMMAND ----------

# Get all assembled submissions for this batch
sub_query = f"SELECT * FROM c WHERE c.examId = '{exam_id}' AND c.uploadBatchId = '{batch_id}' AND c.status = 'assembled'"
submissions = list(submissions_container.query_items(sub_query, enable_cross_partition_query=True))

print(f"Found {len(submissions)} assembled submissions to process")

# COMMAND ----------

def crop_answer_zone(image: Image.Image, bbox: dict, img_width: int, img_height: int) -> bytes:
    """Crop an answer zone from the page image using template bounding box coordinates."""
    # Convert PDF points to pixel coordinates
    # PDF standard: 72 points per inch. Image at 300 DPI.
    scale_x = img_width / 612.0   # Letter width in points
    scale_y = img_height / 792.0  # Letter height in points

    left = int(bbox["x"] * scale_x)
    top = int(bbox["y"] * scale_y)
    right = int((bbox["x"] + bbox["width"]) * scale_x)
    bottom = int((bbox["y"] + bbox["height"]) * scale_y)

    # Clamp to image bounds
    left = max(0, left)
    top = max(0, top)
    right = min(img_width, right)
    bottom = min(img_height, bottom)

    cropped = image.crop((left, top, right, bottom))
    buf = io.BytesIO()
    cropped.save(buf, format="PNG")
    return buf.getvalue()

# COMMAND ----------

fs_processed = datalake.get_file_system_client("processed")
total_crops = 0

for submission in submissions:
    submission_id = submission["id"]
    student_id = submission["studentId"]
    print(f"\nProcessing submission {submission_id} (student: {student_id})")

    for page_info in submission.get("pages", []):
        page_num = page_info["pageNumber"]
        image_uri = page_info["imageUri"]

        # Extract the path from the full URI
        path_start = image_uri.find("/processed/") + len("/processed/")
        image_path = image_uri[path_start:]

        # Download page image
        file_client = fs_processed.get_file_client(image_path)
        img_bytes = file_client.download_file().readall()
        img = Image.open(io.BytesIO(img_bytes))
        img_width, img_height = img.size

        # Get questions for this page
        page_questions = questions_by_page.get(page_num, [])

        for question in page_questions:
            q_id = question["id"]
            q_type = question["type"]
            bbox = question["boundingBox"]

            # Crop the answer zone
            crop_bytes = crop_answer_zone(img, bbox, img_width, img_height)

            # Upload crop to Data Lake
            crop_path = f"{tenant_id}/{exam_id}/{submission_id}/crops/q_{q_id}.png"
            crop_client = fs_processed.get_file_client(crop_path)
            crop_client.upload_data(crop_bytes, overwrite=True)

            crop_uri = f"https://{storage_account_name}.dfs.core.windows.net/processed/{crop_path}"

            # Determine processor based on question type
            processor = {
                "text": "doc-intelligence",
                "equation": "mathpix+gpt4o",
                "diagram": "gpt4o-vision",
                "checkbox": "deterministic",
            }.get(q_type, "doc-intelligence")

            # Create grading result entry in Cosmos DB
            grading_result = {
                "id": str(uuid.uuid4()),
                "submissionId": submission_id,
                "questionId": q_id,
                "examId": exam_id,
                "tenantId": tenant_id,
                "cropImageUri": crop_uri,
                "processor": processor,
                "status": "pending",
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
            }
            results_container.upsert_item(grading_result)
            total_crops += 1

    # Update submission status
    submission["status"] = "layout_parsed"
    submission["updatedAt"] = datetime.utcnow().isoformat()
    submissions_container.upsert_item(submission)

# COMMAND ----------

result = {
    "exam_id": exam_id,
    "batch_id": batch_id,
    "submissions_processed": len(submissions),
    "total_crops": total_crops,
    "correlation_id": correlation_id,
}
dbutils.notebook.exit(json.dumps(result))
