output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "data_lake_account_name" {
  value = module.data_lake.storage_account_name
}

output "cosmos_db_endpoint" {
  value = module.cosmos_db.endpoint
}

output "event_hub_namespace" {
  value = module.event_hubs.namespace_name
}

output "container_apps_fqdn" {
  value = module.container_apps.default_domain
}

output "databricks_workspace_url" {
  value = module.databricks.workspace_url
}
