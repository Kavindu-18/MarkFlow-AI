# Scaling Playbook

## Component Scaling Matrix

| Component | Scaling Method | Min | Max | Trigger |
|-----------|---------------|-----|-----|---------|
| API Gateway | Container Apps auto-scale | 1 | 10 | HTTP concurrency > 50 |
| LTI Service | Container Apps auto-scale | 1 | 5 | HTTP concurrency > 30 |
| Web App | Container Apps auto-scale | 1 | 5 | HTTP concurrency > 100 |
| Databricks | Cluster auto-scale | 1 | 8 | Pending tasks |
| Cosmos DB | Serverless (auto) | 400 RU | 4000 RU | Request rate |
| Event Hubs | Partition count | 4 | 32 | Throughput units |
| PostgreSQL | Manual (SKU change) | B_Standard_B1ms | GP_Standard_D4s | CPU/memory |

## Scaling Procedures

### Container Apps

Adjust in Terraform:

```hcl
# infra/terraform/modules/container-apps/main.tf
resource "azurerm_container_app" "api_gateway" {
  template {
    min_replicas = 2   # Increase for production load
    max_replicas = 20  # Increase ceiling
  }
}
```

Deploy: `terraform apply -var-file=environments/prod.tfvars`

Or emergency CLI scale:
```bash
az containerapp update -n ca-api-gateway -g rg-markflow-prod \
  --min-replicas 3 --max-replicas 20
```

### Databricks Cluster

Edit `pipelines/databricks/jobs/cluster_config.json`:
```json
{
  "autoscale": {
    "min_workers": 2,
    "max_workers": 16
  },
  "node_type_id": "Standard_DS4_v2"
}
```

### Event Hubs Partitions

Partitions cannot be decreased. Plan ahead:

```bash
# Check current partition count
az eventhubs eventhub show -g rg-markflow-prod \
  --namespace-name evhns-markflow-prod -n exam-uploaded \
  --query partitionCount

# Increase (cannot decrease)
az eventhubs eventhub update -g rg-markflow-prod \
  --namespace-name evhns-markflow-prod -n exam-uploaded \
  --partition-count 8
```

### PostgreSQL Vertical Scale

```bash
az postgres flexible-server update -g rg-markflow-prod \
  -n psql-markflow-prod --sku-name GP_Standard_D4s_v3
```

## Load Testing

Before scaling decisions, run load tests:

```bash
# Install k6
# Create test script targeting API gateway
k6 run --vus 100 --duration 5m scripts/load-test.js
```

Key metrics to watch:
- p95 response time < 500ms
- Error rate < 0.1%
- Cosmos DB RU consumption (Portal → Metrics)
- Container App replica count

## Cost Optimization

- **Dev/Staging**: min_replicas = 0 (scale to zero)
- **Prod off-peak**: min_replicas = 1
- **Databricks**: Use spot instances (already configured with on-demand fallback)
- **Cosmos DB**: Serverless is cost-effective up to ~50K RU/s sustained; beyond that, switch to provisioned
- **ADLS**: Use lifecycle management to move old data to cool/archive tier

```bash
az storage account management-policy create \
  --account-name stmarkflow<env> -g rg-markflow-<env> \
  --policy @lifecycle-policy.json
```
