variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "vnet_id" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_databricks_workspace" "main" {
  name                = "dbw-markflow-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "standard"

  tags = var.tags
}

output "workspace_url" { value = azurerm_databricks_workspace.main.workspace_url }
output "workspace_id" { value = azurerm_databricks_workspace.main.id }
