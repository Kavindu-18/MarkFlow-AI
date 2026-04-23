variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "subnet_id" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_storage_account" "datalake" {
  name                     = "stmarkflow${var.environment}"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
  is_hns_enabled           = true # Hierarchical namespace for Data Lake Gen2
  min_tls_version          = "TLS1_2"

  blob_properties {
    delete_retention_policy {
      days = 7
    }
  }

  tags = var.tags
}

resource "azurerm_storage_data_lake_gen2_filesystem" "raw_uploads" {
  name               = "raw-uploads"
  storage_account_id = azurerm_storage_account.datalake.id
}

resource "azurerm_storage_data_lake_gen2_filesystem" "processed" {
  name               = "processed"
  storage_account_id = azurerm_storage_account.datalake.id
}

resource "azurerm_storage_data_lake_gen2_filesystem" "graded" {
  name               = "graded"
  storage_account_id = azurerm_storage_account.datalake.id
}

output "storage_account_name" { value = azurerm_storage_account.datalake.name }
output "storage_account_id" { value = azurerm_storage_account.datalake.id }
output "primary_dfs_endpoint" { value = azurerm_storage_account.datalake.primary_dfs_endpoint }
