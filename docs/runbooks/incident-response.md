# Incident Response Runbook

## Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| SEV-1 | Platform down / data loss | 15 min | All API requests failing |
| SEV-2 | Major feature broken | 1 hour | Grading pipeline stuck |
| SEV-3 | Degraded performance | 4 hours | Slow PDF processing |
| SEV-4 | Minor issue | Next business day | UI glitch |

## On-Call Escalation

1. Primary on-call receives PagerDuty alert
2. Acknowledge within response SLA
3. Open incident channel in Teams/Slack
4. If not resolved in 30 min → escalate to secondary

## Common Incidents

### API Gateway returning 5xx

1. Check Container Apps logs:
   ```bash
   az containerapp logs show -n ca-api-gateway -g rg-markflow-<env> --type system
   ```
2. Verify Cosmos DB connectivity:
   ```bash
   az cosmosdb show --name cosmos-markflow-<env> -g rg-markflow-<env> --query "readLocations"
   ```
3. Check Application Insights for error traces:
   - Portal → Application Insights → Failures → filter by 5xx
4. If OOM → scale up container: edit min/max replicas in Terraform and deploy

### Grading Pipeline Stuck

1. Check Databricks job run status:
   - Databricks workspace → Workflows → Job Runs
2. Look for failed notebook:
   ```
   01_pdf_splitter → 02_qr_decoder → 03_layout_analyzer → 04_ai_router → 05_score_aggregator
   ```
3. Check the specific notebook's error output
4. Common causes:
   - Azure Document Intelligence rate limit → check 429 errors, back off
   - ADLS permission issue → verify managed identity roles
   - Cosmos DB RU throttling → increase throughput or switch from serverless

### Event Hub Consumer Lag

1. Check consumer group lag:
   ```bash
   az eventhubs eventhub consumer-group list --resource-group rg-markflow-<env> \
     --namespace-name evhns-markflow-<env> --eventhub-name exam-uploaded
   ```
2. If lag growing → check Airflow DAG execution:
   - Airflow UI → DAGs → exam_ingestion_pipeline → Recent runs
3. If Airflow healthy but pipeline slow → scale Databricks cluster

### LTI Launch Failures

1. Check LTI service logs for OIDC errors
2. Verify platform registration in PostgreSQL:
   ```sql
   SELECT * FROM lti_registrations WHERE platform_id = '<platform>';
   ```
3. Check JWKS endpoint accessibility from the container
4. Validate clock skew (JWT `iat`/`exp` claims)

## Post-Incident

1. Write RCA (Root Cause Analysis) within 48 hours
2. Create follow-up tickets for preventive measures
3. Update this runbook if new failure mode discovered
