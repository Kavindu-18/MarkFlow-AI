variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "subnet_id" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_cosmosdb_account" "main" {
  name                = "cosmos-markflow-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableServerless"
  }

  tags = var.tags
}

resource "azurerm_cosmosdb_sql_database" "markflow" {
  name                = "markflow"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
}

resource "azurerm_cosmosdb_sql_container" "exams" {
  name                = "exams"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.markflow.name
  partition_key_paths = ["/tenantId"]

  indexing_policy {
    indexing_mode = "consistent"
    included_path { path = "/*" }
  }
}

resource "azurerm_cosmosdb_sql_container" "submissions" {
  name                = "submissions"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.markflow.name
  partition_key_paths = ["/examId"]

  indexing_policy {
    indexing_mode = "consistent"
    included_path { path = "/*" }
  }
}

resource "azurerm_cosmosdb_sql_container" "grading_results" {
  name                = "grading-results"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.markflow.name
  partition_key_paths = ["/submissionId"]

  indexing_policy {
    indexing_mode = "consistent"
    included_path { path = "/*" }
  }
}

output "endpoint" { value = azurerm_cosmosdb_account.main.endpoint }
output "account_name" { value = azurerm_cosmosdb_account.main.name }
