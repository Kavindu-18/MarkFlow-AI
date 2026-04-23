"""
MarkFlow AI — Exam Ingestion DAG
=================================
Orchestrates the full pipeline from upload notification to grading completion.

Trigger: Event Hub consumer on `exam-uploaded` topic
Pipeline: Upload → Split → QR Decode → Reassemble → Layout Parse → AI Grade → Aggregate

Each task runs a Databricks notebook with retry + exponential backoff.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator
from airflow.operators.python import PythonOperator
from airflow.models import Variable

# ─── DAG Configuration ──────────────────────────────────────

default_args = {
    "owner": "markflow",
    "depends_on_past": False,
    "email_on_failure": True,
    "email_on_retry": False,
    "email": [Variable.get("alert_email", default_var="ops@markflow.ai")],
    "retries": 3,
    "retry_delay": timedelta(minutes=2),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=15),
    "execution_timeout": timedelta(hours=1),
}

DATABRICKS_CONN_ID = "databricks_default"
JOB_CLUSTER_KEY = "markflow-auto-scaling"

# Common notebook parameters (overridden per run via trigger)
COMMON_PARAMS = {
    "storage_account_name": Variable.get("storage_account_name"),
    "cosmos_endpoint": Variable.get("cosmos_endpoint"),
    "doc_intelligence_endpoint": Variable.get("doc_intelligence_endpoint"),
    "openai_endpoint": Variable.get("openai_endpoint"),
    "eventhub_namespace": Variable.get("eventhub_namespace"),
}

# ─── DAG Definition ─────────────────────────────────────────

with DAG(
    dag_id="exam_ingestion_pipeline",
    default_args=default_args,
    description="Full exam ingestion and AI grading pipeline",
    schedule_interval=None,  # Triggered externally via Event Hub consumer
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=10,
    tags=["markflow", "grading", "pipeline"],
) as dag:

    def extract_trigger_params(**context):
        """Extract exam/batch params from the DAG trigger configuration."""
        conf = context["dag_run"].conf or {}
        exam_id = conf.get("exam_id", "")
        batch_id = conf.get("batch_id", "")
        tenant_id = conf.get("tenant_id", "")
        correlation_id = conf.get("correlation_id", "")
        source_uri = conf.get("source_uri", "")

        if not all([exam_id, batch_id, tenant_id]):
            raise ValueError("Missing required trigger params: exam_id, batch_id, tenant_id")

        context["ti"].xcom_push(key="exam_id", value=exam_id)
        context["ti"].xcom_push(key="batch_id", value=batch_id)
        context["ti"].xcom_push(key="tenant_id", value=tenant_id)
        context["ti"].xcom_push(key="correlation_id", value=correlation_id)
        context["ti"].xcom_push(key="source_uri", value=source_uri)

    parse_trigger = PythonOperator(
        task_id="parse_trigger_params",
        python_callable=extract_trigger_params,
        provide_context=True,
    )

    pdf_split = DatabricksRunNowOperator(
        task_id="pdf_split",
        databricks_conn_id=DATABRICKS_CONN_ID,
        job_id=Variable.get("databricks_job_id_pdf_splitter"),
        notebook_params={
            **COMMON_PARAMS,
            "exam_id": "{{ ti.xcom_pull(key='exam_id') }}",
            "batch_id": "{{ ti.xcom_pull(key='batch_id') }}",
            "tenant_id": "{{ ti.xcom_pull(key='tenant_id') }}",
            "source_uri": "{{ ti.xcom_pull(key='source_uri') }}",
            "correlation_id": "{{ ti.xcom_pull(key='correlation_id') }}",
        },
    )

    qr_decode = DatabricksRunNowOperator(
        task_id="qr_decode",
        databricks_conn_id=DATABRICKS_CONN_ID,
        job_id=Variable.get("databricks_job_id_qr_decoder"),
        notebook_params={
            **COMMON_PARAMS,
            "exam_id": "{{ ti.xcom_pull(key='exam_id') }}",
            "batch_id": "{{ ti.xcom_pull(key='batch_id') }}",
            "tenant_id": "{{ ti.xcom_pull(key='tenant_id') }}",
            "correlation_id": "{{ ti.xcom_pull(key='correlation_id') }}",
        },
    )

    layout_parse = DatabricksRunNowOperator(
        task_id="layout_parse",
        databricks_conn_id=DATABRICKS_CONN_ID,
        job_id=Variable.get("databricks_job_id_layout_analyzer"),
        notebook_params={
            **COMMON_PARAMS,
            "exam_id": "{{ ti.xcom_pull(key='exam_id') }}",
            "batch_id": "{{ ti.xcom_pull(key='batch_id') }}",
            "tenant_id": "{{ ti.xcom_pull(key='tenant_id') }}",
            "correlation_id": "{{ ti.xcom_pull(key='correlation_id') }}",
        },
    )

    ai_grade = DatabricksRunNowOperator(
        task_id="ai_grade",
        databricks_conn_id=DATABRICKS_CONN_ID,
        job_id=Variable.get("databricks_job_id_ai_router"),
        notebook_params={
            **COMMON_PARAMS,
            "exam_id": "{{ ti.xcom_pull(key='exam_id') }}",
            "batch_id": "{{ ti.xcom_pull(key='batch_id') }}",
            "tenant_id": "{{ ti.xcom_pull(key='tenant_id') }}",
            "correlation_id": "{{ ti.xcom_pull(key='correlation_id') }}",
        },
    )

    aggregate_scores = DatabricksRunNowOperator(
        task_id="aggregate_scores",
        databricks_conn_id=DATABRICKS_CONN_ID,
        job_id=Variable.get("databricks_job_id_score_aggregator"),
        notebook_params={
            **COMMON_PARAMS,
            "exam_id": "{{ ti.xcom_pull(key='exam_id') }}",
            "batch_id": "{{ ti.xcom_pull(key='batch_id') }}",
            "tenant_id": "{{ ti.xcom_pull(key='tenant_id') }}",
            "correlation_id": "{{ ti.xcom_pull(key='correlation_id') }}",
            "eventhub_name": "grading-completed",
        },
    )

    # Pipeline sequence
    parse_trigger >> pdf_split >> qr_decode >> layout_parse >> ai_grade >> aggregate_scores
