variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "subnet_id" { type = string }
variable "admin_password" { type = string; sensitive = true }
variable "tags" { type = map(string) }

resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "psql-markflow-${var.environment}"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  version                       = "16"
  delegated_subnet_id           = var.subnet_id
  administrator_login           = "markflow_admin"
  administrator_password        = var.admin_password
  storage_mb                    = 32768
  sku_name                      = "B_Standard_B1ms"
  zone                          = "1"

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_database" "markflow" {
  name      = "markflow"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

output "server_fqdn" { value = azurerm_postgresql_flexible_server.main.fqdn }
output "database_name" { value = azurerm_postgresql_flexible_server_database.markflow.name }
