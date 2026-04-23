# Databricks notebook source
# COMMAND ----------
# MAGIC %md
# MAGIC # 05 — Score Aggregator
# MAGIC Aggregate per-question scores into a final submission grade.
# MAGIC Publish `GradingCompleted` events.

# COMMAND ----------

import json
import uuid
from datetime import datetime
from azure.cosmos import CosmosClient
from azure.eventhub import EventHubProducerClient, EventData

# COMMAND ----------

dbutils.widgets.text("exam_id", "")
dbutils.widgets.text("batch_id", "")
dbutils.widgets.text("tenant_id", "")
dbutils.widgets.text("cosmos_endpoint", "")
dbutils.widgets.text("eventhub_namespace", "")
dbutils.widgets.text("eventhub_name", "grading-completed")
dbutils.widgets.text("correlation_id", "")

exam_id = dbutils.widgets.get("exam_id")
batch_id = dbutils.widgets.get("batch_id")
tenant_id = dbutils.widgets.get("tenant_id")
cosmos_endpoint = dbutils.widgets.get("cosmos_endpoint")
eventhub_namespace = dbutils.widgets.get("eventhub_namespace")
eventhub_name = dbutils.widgets.get("eventhub_name")
correlation_id = dbutils.widgets.get("correlation_id")

# COMMAND ----------

cosmos_key = dbutils.secrets.get(scope="markflow", key="cosmos-key")
eventhub_conn_str = dbutils.secrets.get(scope="markflow", key="eventhub-connection-string")

cosmos_client = CosmosClient(cosmos_endpoint, cosmos_key)
db = cosmos_client.get_database_client("markflow")
submissions_container = db.get_container_client("submissions")
results_container = db.get_container_client("grading-results")
exams_container = db.get_container_client("exams")

# COMMAND ----------

# Load exam template for max points
exam_query = f"SELECT * FROM c WHERE c.id = '{exam_id}' AND c.tenantId = '{tenant_id}'"
exam_template = list(exams_container.query_items(exam_query, enable_cross_partition_query=True))[0]
max_total = sum(q["points"] for q in exam_template.get("questions", []))

# Get all submissions for this batch
sub_query = f"SELECT * FROM c WHERE c.examId = '{exam_id}' AND c.uploadBatchId = '{batch_id}' AND c.status IN ('layout_parsed', 'grading')"
submissions = list(submissions_container.query_items(sub_query, enable_cross_partition_query=True))

print(f"Aggregating scores for {len(submissions)} submissions (max possible: {max_total})")

# COMMAND ----------

events_to_publish = []
aggregated = 0

for submission in submissions:
    submission_id = submission["id"]

    # Get all grading results for this submission
    res_query = f"SELECT * FROM c WHERE c.submissionId = '{submission_id}'"
    results = list(results_container.query_items(res_query, enable_cross_partition_query=True))

    # Check if all questions are graded
    graded_results = [r for r in results if r["status"] in ("graded", "review_required", "overridden")]
    failed_results = [r for r in results if r["status"] == "grading_failed"]
    pending_results = [r for r in results if r["status"] == "pending"]

    if pending_results:
        print(f"Submission {submission_id}: {len(pending_results)} still pending, skipping")
        continue

    # Calculate totals
    total_score = 0
    min_confidence = 1.0

    for r in graded_results:
        ai = r.get("aiResult", {})
        override = r.get("override")

        score = override["score"] if override else ai.get("score", 0)
        confidence = ai.get("confidence", 0)

        total_score += score
        min_confidence = min(min_confidence, confidence)

    percentage = (total_score / max_total * 100) if max_total > 0 else 0
    needs_review = min_confidence < 0.85 or len(failed_results) > 0

    # Update submission
    submission["totalScore"] = total_score
    submission["maxScore"] = max_total
    submission["percentage"] = round(percentage, 2)
    submission["overallConfidence"] = round(min_confidence, 4)
    submission["status"] = "review_required" if needs_review else "graded"
    submission["updatedAt"] = datetime.utcnow().isoformat()
    submissions_container.upsert_item(submission)

    # Prepare event
    event = {
        "eventId": str(uuid.uuid4()),
        "eventType": "GradingCompleted",
        "tenantId": tenant_id,
        "timestamp": datetime.utcnow().isoformat(),
        "correlationId": correlation_id,
        "examId": exam_id,
        "submissionId": submission_id,
        "totalScore": total_score,
        "maxScore": max_total,
        "overallConfidence": round(min_confidence, 4),
    }
    events_to_publish.append(event)
    aggregated += 1

    print(f"Submission {submission_id}: {total_score}/{max_total} ({percentage:.1f}%) confidence={min_confidence:.2f} → {submission['status']}")

# COMMAND ----------

# Publish GradingCompleted events to Event Hub
if events_to_publish:
    producer = EventHubProducerClient.from_connection_string(
        conn_str=eventhub_conn_str,
        eventhub_name=eventhub_name,
    )
    with producer:
        batch = producer.create_batch()
        for event in events_to_publish:
            batch.add(EventData(json.dumps(event)))
        producer.send_batch(batch)

    print(f"Published {len(events_to_publish)} GradingCompleted events")

# COMMAND ----------

output = {
    "exam_id": exam_id,
    "batch_id": batch_id,
    "submissions_aggregated": aggregated,
    "events_published": len(events_to_publish),
    "correlation_id": correlation_id,
}
dbutils.notebook.exit(json.dumps(output))
