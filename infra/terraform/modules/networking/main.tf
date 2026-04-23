variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_virtual_network" "main" {
  name                = "vnet-markflow-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = ["10.0.0.0/16"]
  tags                = var.tags
}

resource "azurerm_subnet" "container_apps" {
  name                 = "snet-container-apps"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/23"]
  delegation {
    name = "container-apps"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "private_endpoints" {
  name                 = "snet-private-endpoints"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.4.0/24"]
}

resource "azurerm_subnet" "database" {
  name                 = "snet-database"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.5.0/24"]
  delegation {
    name = "postgresql"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "databricks_public" {
  name                 = "snet-databricks-public"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.6.0/24"]
  delegation {
    name = "databricks"
    service_delegation {
      name    = "Microsoft.Databricks/workspaces"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "databricks_private" {
  name                 = "snet-databricks-private"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.7.0/24"]
  delegation {
    name = "databricks"
    service_delegation {
      name    = "Microsoft.Databricks/workspaces"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_network_security_group" "default" {
  name                = "nsg-markflow-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

output "vnet_id" { value = azurerm_virtual_network.main.id }
output "container_apps_subnet_id" { value = azurerm_subnet.container_apps.id }
output "private_endpoints_subnet_id" { value = azurerm_subnet.private_endpoints.id }
output "database_subnet_id" { value = azurerm_subnet.database.id }
output "databricks_public_subnet_name" { value = azurerm_subnet.databricks_public.name }
output "databricks_private_subnet_name" { value = azurerm_subnet.databricks_private.name }
