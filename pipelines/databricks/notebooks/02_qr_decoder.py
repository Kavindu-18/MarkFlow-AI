# Databricks notebook source
# COMMAND ----------
# MAGIC %md
# MAGIC # 02 — QR Decoder
# MAGIC Decode QR codes on each page to extract student/page metadata.
# MAGIC Write metadata to Cosmos DB `submissions` container.

# COMMAND ----------

import io
import json
from PIL import Image
from pyzbar.pyzbar import decode as decode_qr
from azure.storage.filedatalake import DataLakeServiceClient
from azure.cosmos import CosmosClient

# COMMAND ----------

dbutils.widgets.text("exam_id", "")
dbutils.widgets.text("batch_id", "")
dbutils.widgets.text("tenant_id", "")
dbutils.widgets.text("storage_account_name", "")
dbutils.widgets.text("cosmos_endpoint", "")
dbutils.widgets.text("correlation_id", "")

exam_id = dbutils.widgets.get("exam_id")
batch_id = dbutils.widgets.get("batch_id")
tenant_id = dbutils.widgets.get("tenant_id")
storage_account_name = dbutils.widgets.get("storage_account_name")
cosmos_endpoint = dbutils.widgets.get("cosmos_endpoint")
correlation_id = dbutils.widgets.get("correlation_id")

# COMMAND ----------

def get_datalake_client():
    credential = dbutils.secrets.get(scope="markflow", key="storage-account-key")
    return DataLakeServiceClient(
        account_url=f"https://{storage_account_name}.dfs.core.windows.net",
        credential=credential,
    )

def get_cosmos_container():
    key = dbutils.secrets.get(scope="markflow", key="cosmos-key")
    client = CosmosClient(cosmos_endpoint, key)
    db = client.get_database_client("markflow")
    return db.get_container_client("submissions")

# COMMAND ----------

def decode_qr_payload(raw_data: str):
    """Parse QR string format: {examId}:{studentId}:{pageNumber}:{totalPages}"""
    parts = raw_data.split(":")
    if len(parts) != 4:
        return None
    try:
        return {
            "exam_id": parts[0],
            "student_id": parts[1],
            "page_number": int(parts[2]),
            "total_pages": int(parts[3]),
        }
    except (ValueError, IndexError):
        return None

# COMMAND ----------

datalake = get_datalake_client()
cosmos = get_cosmos_container()

# List all page images
fs_client = datalake.get_file_system_client("processed")
pages_prefix = f"{tenant_id}/{exam_id}/{batch_id}/pages/"
page_paths = list(fs_client.get_paths(path=pages_prefix))

decoded_pages = []
failed_pages = []

for page_path in page_paths:
    if not page_path.name.lower().endswith(('.png', '.jpg', '.jpeg')):
        continue

    try:
        file_client = fs_client.get_file_client(page_path.name)
        img_bytes = file_client.download_file().readall()
        img = Image.open(io.BytesIO(img_bytes))

        # Decode QR codes
        qr_results = decode_qr(img)

        if not qr_results:
            print(f"WARN: No QR found on {page_path.name}")
            failed_pages.append({
                "path": page_path.name,
                "reason": "no_qr_detected",
            })
            continue

        # Use the first valid QR decode
        payload = None
        for qr in qr_results:
            raw = qr.data.decode("utf-8")
            payload = decode_qr_payload(raw)
            if payload:
                break

        if not payload:
            print(f"WARN: QR unreadable on {page_path.name}")
            failed_pages.append({
                "path": page_path.name,
                "reason": "qr_parse_failed",
            })
            continue

        decoded_pages.append({
            "path": page_path.name,
            "student_id": payload["student_id"],
            "page_number": payload["page_number"],
            "total_pages": payload["total_pages"],
            "image_uri": f"https://{storage_account_name}.dfs.core.windows.net/processed/{page_path.name}",
        })

        print(f"Decoded: student={payload['student_id']}, page={payload['page_number']}/{payload['total_pages']}")

    except Exception as e:
        print(f"ERROR processing {page_path.name}: {e}")
        failed_pages.append({"path": page_path.name, "reason": str(e)})

# COMMAND ----------

# Group by student and upsert submissions to Cosmos DB
from collections import defaultdict
import uuid
from datetime import datetime

students = defaultdict(list)
for page in decoded_pages:
    students[page["student_id"]].append(page)

submissions_created = 0
for student_id, pages in students.items():
    pages.sort(key=lambda p: p["page_number"])
    total_expected = pages[0]["total_pages"] if pages else 0
    is_complete = len(pages) == total_expected

    submission = {
        "id": str(uuid.uuid4()),
        "examId": exam_id,
        "tenantId": tenant_id,
        "studentId": student_id,
        "status": "assembled" if is_complete else "incomplete",
        "pages": [
            {
                "pageNumber": p["page_number"],
                "imageUri": p["image_uri"],
                "qrDecoded": True,
            }
            for p in pages
        ],
        "uploadBatchId": batch_id,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    }

    cosmos.upsert_item(submission)
    submissions_created += 1

# Write failed QR pages as separate submissions for manual review
for failed in failed_pages:
    submission = {
        "id": str(uuid.uuid4()),
        "examId": exam_id,
        "tenantId": tenant_id,
        "studentId": "UNKNOWN",
        "status": "qr_failed",
        "pages": [{"pageNumber": 0, "imageUri": failed["path"], "qrDecoded": False}],
        "uploadBatchId": batch_id,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    }
    cosmos.upsert_item(submission)

# COMMAND ----------

result = {
    "exam_id": exam_id,
    "batch_id": batch_id,
    "decoded_pages": len(decoded_pages),
    "failed_pages": len(failed_pages),
    "submissions_created": submissions_created,
    "correlation_id": correlation_id,
}
dbutils.notebook.exit(json.dumps(result))
