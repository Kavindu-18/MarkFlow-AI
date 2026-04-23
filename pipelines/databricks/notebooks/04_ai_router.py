# Databricks notebook source
# COMMAND ----------
# MAGIC %md
# MAGIC # 04 — AI Router
# MAGIC Route each cropped answer to the appropriate AI service based on question type:
# MAGIC - text → Azure Doc Intelligence OCR → GPT-4o
# MAGIC - equation → Mathpix API → GPT-4o
# MAGIC - diagram → GPT-4o Vision directly
# MAGIC - checkbox → Deterministic scoring (no LLM)

# COMMAND ----------

import json
import uuid
import base64
import requests
from datetime import datetime
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from azure.storage.filedatalake import DataLakeServiceClient
from azure.cosmos import CosmosClient
from openai import AzureOpenAI

# COMMAND ----------

dbutils.widgets.text("exam_id", "")
dbutils.widgets.text("tenant_id", "")
dbutils.widgets.text("batch_id", "")
dbutils.widgets.text("storage_account_name", "")
dbutils.widgets.text("cosmos_endpoint", "")
dbutils.widgets.text("doc_intelligence_endpoint", "")
dbutils.widgets.text("openai_endpoint", "")
dbutils.widgets.text("correlation_id", "")

exam_id = dbutils.widgets.get("exam_id")
tenant_id = dbutils.widgets.get("tenant_id")
batch_id = dbutils.widgets.get("batch_id")
storage_account_name = dbutils.widgets.get("storage_account_name")
cosmos_endpoint = dbutils.widgets.get("cosmos_endpoint")
doc_intelligence_endpoint = dbutils.widgets.get("doc_intelligence_endpoint")
openai_endpoint = dbutils.widgets.get("openai_endpoint")
correlation_id = dbutils.widgets.get("correlation_id")

# COMMAND ----------

# Initialize clients
storage_key = dbutils.secrets.get(scope="markflow", key="storage-account-key")
cosmos_key = dbutils.secrets.get(scope="markflow", key="cosmos-key")
di_key = dbutils.secrets.get(scope="markflow", key="doc-intelligence-key")
openai_key = dbutils.secrets.get(scope="markflow", key="openai-key")
mathpix_app_id = dbutils.secrets.get(scope="markflow", key="mathpix-app-id")
mathpix_app_key = dbutils.secrets.get(scope="markflow", key="mathpix-app-key")

datalake = DataLakeServiceClient(
    account_url=f"https://{storage_account_name}.dfs.core.windows.net",
    credential=storage_key,
)

cosmos_client = CosmosClient(cosmos_endpoint, cosmos_key)
db = cosmos_client.get_database_client("markflow")
results_container = db.get_container_client("grading-results")
exams_container = db.get_container_client("exams")

doc_intel = DocumentAnalysisClient(
    endpoint=doc_intelligence_endpoint,
    credential=AzureKeyCredential(di_key),
)

aoai_client = AzureOpenAI(
    azure_endpoint=openai_endpoint,
    api_key=openai_key,
    api_version="2024-08-01-preview",
)

# COMMAND ----------

GRADING_SYSTEM_PROMPT = """You are MarkFlow AI Grader. You grade student answers against a teacher's rubric.

INPUT: { studentAnswer: "...", rubric: "...", maxPoints: N, questionType: "...", referenceAnswer: "..." }
OUTPUT (strict JSON only): { "score": <0-N integer>, "feedback": "<specific, constructive, 1-3 sentences>", "confidence": <0.0-1.0>, "reasoning": "<chain-of-thought explanation>" }

Rules:
- Score ONLY based on the rubric criteria provided. Do not infer criteria.
- If the answer is blank or illegible, return score 0, confidence 1.0, feedback "No answer detected."
- confidence < 0.85 triggers human review. Be conservative with confidence.
- The "reasoning" field is for internal audit — explain step by step how you arrived at the score.
- Return ONLY valid JSON. No markdown, no extra text."""

# COMMAND ----------

def download_crop(crop_uri: str) -> bytes:
    """Download a crop image from Data Lake."""
    path_start = crop_uri.find("/processed/") + len("/processed/")
    image_path = crop_uri[path_start:]
    fs = datalake.get_file_system_client("processed")
    return fs.get_file_client(image_path).download_file().readall()

def ocr_with_doc_intelligence(image_bytes: bytes) -> str:
    """Extract handwritten text using Azure Document Intelligence."""
    poller = doc_intel.begin_analyze_document("prebuilt-read", document=image_bytes)
    result = poller.result()
    lines = []
    for page in result.pages:
        for line in page.lines:
            lines.append(line.content)
    return "\n".join(lines)

def ocr_with_mathpix(image_bytes: bytes) -> str:
    """Extract LaTeX from an equation image using Mathpix API."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    r = requests.post(
        "https://api.mathpix.com/v3/text",
        headers={
            "app_id": mathpix_app_id,
            "app_key": mathpix_app_key,
            "Content-type": "application/json",
        },
        json={
            "src": f"data:image/png;base64,{b64}",
            "formats": ["latex_simplified"],
            "data_options": {"include_asciimath": True},
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json().get("latex_simplified", "")

def grade_with_gpt4o(student_answer: str, rubric: str, max_points: int,
                      question_type: str, reference_answer: str = "") -> dict:
    """Send text-based answer to GPT-4o for grading."""
    user_content = json.dumps({
        "studentAnswer": student_answer,
        "rubric": rubric,
        "maxPoints": max_points,
        "questionType": question_type,
        "referenceAnswer": reference_answer,
    })

    response = aoai_client.chat.completions.create(
        model="gpt-4o",
        temperature=0.1,
        messages=[
            {"role": "system", "content": GRADING_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)

def grade_diagram_with_vision(image_bytes: bytes, rubric: str,
                                max_points: int, reference_answer: str = "") -> dict:
    """Send a diagram image directly to GPT-4o Vision for grading."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")

    user_content = [
        {"type": "text", "text": json.dumps({
            "rubric": rubric,
            "maxPoints": max_points,
            "questionType": "diagram",
            "referenceAnswer": reference_answer,
        })},
        {"type": "image_url", "image_url": {
            "url": f"data:image/png;base64,{b64}",
            "detail": "high",
        }},
    ]

    response = aoai_client.chat.completions.create(
        model="gpt-4o",
        temperature=0.1,
        messages=[
            {"role": "system", "content": GRADING_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)

def grade_checkbox(image_bytes: bytes) -> dict:
    """Deterministic checkbox grading via Document Intelligence."""
    poller = doc_intel.begin_analyze_document("prebuilt-layout", document=image_bytes)
    result = poller.result()

    checked = False
    for page in result.pages:
        for mark in getattr(page, "selection_marks", []):
            if mark.state == "selected":
                checked = True
                break

    return {
        "score": 1 if checked else 0,
        "feedback": "Checkbox marked." if checked else "Checkbox not marked.",
        "confidence": 0.95,
        "reasoning": f"Selection mark detection: {'selected' if checked else 'unselected'}.",
    }

# COMMAND ----------

# Load exam template for rubric data
exam_query = f"SELECT * FROM c WHERE c.id = '{exam_id}' AND c.tenantId = '{tenant_id}'"
exam_template = list(exams_container.query_items(exam_query, enable_cross_partition_query=True))[0]
questions_map = {q["id"]: q for q in exam_template.get("questions", [])}

# Get all pending grading results for this exam
results_query = f"SELECT * FROM c WHERE c.examId = '{exam_id}' AND c.status = 'pending'"
pending_results = list(results_container.query_items(results_query, enable_cross_partition_query=True))

print(f"Processing {len(pending_results)} pending grading results")

# COMMAND ----------

graded = 0
failed = 0

for result in pending_results:
    result_id = result["id"]
    question = questions_map.get(result["questionId"])
    if not question:
        print(f"WARN: Question {result['questionId']} not found in template")
        continue

    try:
        image_bytes = download_crop(result["cropImageUri"])
        processor = result["processor"]
        rubric = question.get("rubric", "")
        max_points = question.get("points", 10)
        ref_answer = question.get("referenceAnswer", "")

        ai_result = None
        extracted = ""

        if processor == "doc-intelligence":
            extracted = ocr_with_doc_intelligence(image_bytes)
            ai_result = grade_with_gpt4o(extracted, rubric, max_points, "text", ref_answer)

        elif processor == "mathpix+gpt4o":
            try:
                extracted = ocr_with_mathpix(image_bytes)
            except Exception:
                # Fallback to GPT-4o Vision if Mathpix fails
                print(f"Mathpix failed for {result_id}, falling back to GPT-4o Vision")
                ai_result = grade_diagram_with_vision(image_bytes, rubric, max_points, ref_answer)
                extracted = "(Mathpix fallback — graded via vision)"
            if ai_result is None:
                ai_result = grade_with_gpt4o(extracted, rubric, max_points, "equation", ref_answer)

        elif processor == "gpt4o-vision":
            ai_result = grade_diagram_with_vision(image_bytes, rubric, max_points, ref_answer)

        elif processor == "deterministic":
            ai_result = grade_checkbox(image_bytes)

        if ai_result:
            result["aiResult"] = {
                "score": ai_result["score"],
                "feedback": ai_result["feedback"],
                "confidence": ai_result["confidence"],
                "reasoning": ai_result["reasoning"],
            }
            result["extractedContent"] = extracted
            result["status"] = "graded" if ai_result["confidence"] >= 0.85 else "review_required"
            result["updatedAt"] = datetime.utcnow().isoformat()
            results_container.upsert_item(result)
            graded += 1
        else:
            result["status"] = "grading_failed"
            result["updatedAt"] = datetime.utcnow().isoformat()
            results_container.upsert_item(result)
            failed += 1

    except Exception as e:
        print(f"ERROR grading {result_id}: {e}")
        result["status"] = "grading_failed"
        result["updatedAt"] = datetime.utcnow().isoformat()
        results_container.upsert_item(result)
        failed += 1

# COMMAND ----------

output = {
    "exam_id": exam_id,
    "graded": graded,
    "failed": failed,
    "correlation_id": correlation_id,
}
dbutils.notebook.exit(json.dumps(output))
