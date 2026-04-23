"""
MarkFlow AI — Batch Reprocess DAG
===================================
Re-runs failed grading jobs for a specific exam batch.
Triggered manually from the admin dashboard.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator
from airflow.operators.python import PythonOperator
from airflow.models import Variable

default_args = {
    "owner": "markflow",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "execution_timeout": timedelta(hours=2),
}

DATABRICKS_CONN_ID = "databricks_default"

COMMON_PARAMS = {
    "storage_account_name": Variable.get("storage_account_name"),
    "cosmos_endpoint": Variable.get("cosmos_endpoint"),
    "doc_intelligence_endpoint": Variable.get("doc_intelligence_endpoint"),
    "openai_endpoint": Variable.get("openai_endpoint"),
    "eventhub_namespace": Variable.get("eventhub_namespace"),
}

with DAG(
    dag_id="batch_reprocess_pipeline",
    default_args=default_args,
    description="Re-run failed grading jobs for a specific exam batch",
    schedule_interval=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=5,
    tags=["markflow", "reprocess"],
) as dag:

    def parse_params(**context):
        conf = context["dag_run"].conf or {}
        for key in ["exam_id", "batch_id", "tenant_id"]:
            val = conf.get(key, "")
            if not val:
                raise ValueError(f"Missing required param: {key}")
            context["ti"].xcom_push(key=key, value=val)

        import uuid
        context["ti"].xcom_push(key="correlation_id", value=str(uuid.uuid4()))

    parse_trigger = PythonOperator(
        task_id="parse_trigger_params",
        python_callable=parse_params,
        provide_context=True,
    )

    rerun_ai_grading = DatabricksRunNowOperator(
        task_id="rerun_ai_grading",
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

    reaggregate = DatabricksRunNowOperator(
        task_id="reaggregate_scores",
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

    parse_trigger >> rerun_ai_grading >> reaggregate
