# Databricks notebook source
# COMMAND ----------
# MAGIC %md
# MAGIC # 01 — PDF Splitter
# MAGIC Split multi-page PDF uploads into individual page images (PNG, 300 DPI).
# MAGIC Stores results in `processed/{examId}/{batchId}/pages/`.

# COMMAND ----------

import os
import io
import tempfile
from pdf2image import convert_from_bytes
from azure.storage.filedatalake import DataLakeServiceClient
from pyspark.sql import SparkSession

# COMMAND ----------

# Widget parameters (passed by Airflow/Databricks Job)
dbutils.widgets.text("exam_id", "")
dbutils.widgets.text("batch_id", "")
dbutils.widgets.text("tenant_id", "")
dbutils.widgets.text("source_uri", "")
dbutils.widgets.text("storage_account_name", "")
dbutils.widgets.text("correlation_id", "")

exam_id = dbutils.widgets.get("exam_id")
batch_id = dbutils.widgets.get("batch_id")
tenant_id = dbutils.widgets.get("tenant_id")
source_uri = dbutils.widgets.get("source_uri")
storage_account_name = dbutils.widgets.get("storage_account_name")
correlation_id = dbutils.widgets.get("correlation_id")

print(f"Processing exam={exam_id}, batch={batch_id}, tenant={tenant_id}")
print(f"Correlation ID: {correlation_id}")

# COMMAND ----------

def get_datalake_client():
    """Initialize ADLS Gen2 client using service principal or managed identity."""
    credential = dbutils.secrets.get(scope="markflow", key="storage-account-key")
    return DataLakeServiceClient(
        account_url=f"https://{storage_account_name}.dfs.core.windows.net",
        credential=credential,
    )

# COMMAND ----------

def download_pdf(datalake_client, container, path):
    """Download a PDF file from Data Lake."""
    fs_client = datalake_client.get_file_system_client(container)
    file_client = fs_client.get_file_client(path)
    download = file_client.download_file()
    return download.readall()

def upload_page_image(datalake_client, container, path, image_bytes):
    """Upload a page image to Data Lake."""
    fs_client = datalake_client.get_file_system_client(container)
    file_client = fs_client.get_file_client(path)
    file_client.upload_data(image_bytes, overwrite=True)

# COMMAND ----------

def split_pdf_to_pages(pdf_bytes, dpi=300):
    """Convert PDF bytes to list of PIL Image objects, one per page."""
    try:
        images = convert_from_bytes(pdf_bytes, dpi=dpi, fmt="png")
        print(f"Split PDF into {len(images)} pages at {dpi} DPI")
        return images
    except Exception as e:
        print(f"ERROR: Failed to split PDF: {e}")
        raise

# COMMAND ----------

# Main execution
datalake = get_datalake_client()

# List all PDF/image files in the upload batch directory
source_container = "raw-uploads"
source_prefix = f"{tenant_id}/{exam_id}/{batch_id}/"

fs_client = datalake.get_file_system_client(source_container)
paths = list(fs_client.get_paths(path=source_prefix))

total_pages = 0
failed_files = []

for file_path in paths:
    if not file_path.name.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg')):
        continue

    print(f"Processing: {file_path.name}")

    try:
        file_bytes = download_pdf(datalake, source_container, file_path.name)

        if file_path.name.lower().endswith('.pdf'):
            # Check file size (reject > 50MB)
            if len(file_bytes) > 50 * 1024 * 1024:
                print(f"WARN: File too large ({len(file_bytes)} bytes), quarantining")
                upload_page_image(
                    datalake, source_container,
                    f"failed/{file_path.name}",
                    file_bytes,
                )
                failed_files.append(file_path.name)
                continue

            pages = split_pdf_to_pages(file_bytes)
            for i, page_img in enumerate(pages):
                buf = io.BytesIO()
                page_img.save(buf, format="PNG")
                page_bytes = buf.getvalue()

                dest_path = f"{tenant_id}/{exam_id}/{batch_id}/pages/page_{i + 1:04d}.png"
                upload_page_image(datalake, "processed", dest_path, page_bytes)
                total_pages += 1
        else:
            # Single image file — copy directly to processed
            filename = os.path.basename(file_path.name)
            dest_path = f"{tenant_id}/{exam_id}/{batch_id}/pages/{filename}"
            upload_page_image(datalake, "processed", dest_path, file_bytes)
            total_pages += 1

    except Exception as e:
        print(f"ERROR processing {file_path.name}: {e}")
        failed_files.append(file_path.name)

# COMMAND ----------

# Output results as notebook exit value
import json

result = {
    "exam_id": exam_id,
    "batch_id": batch_id,
    "total_pages": total_pages,
    "failed_files": failed_files,
    "correlation_id": correlation_id,
}
dbutils.notebook.exit(json.dumps(result))
