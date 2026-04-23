terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.14"
    }
  }

  backend "azurerm" {
    # Configured per environment via -backend-config
    # resource_group_name  = "markflow-tfstate-rg"
    # storage_account_name = "markflowtfstate"
    # container_name       = "tfstate"
    # key                  = "markflow.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

# ─── Resource Group ─────────────────────────────────────────

resource "azurerm_resource_group" "main" {
  name     = "rg-markflow-${var.environment}"
  location = var.location

  tags = local.common_tags
}

# ─── Modules ────────────────────────────────────────────────

module "networking" {
  source              = "./modules/networking"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  tags                = local.common_tags
}

module "key_vault" {
  source              = "./modules/key-vault"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  subnet_id           = module.networking.private_endpoints_subnet_id
  tags                = local.common_tags
}

module "monitoring" {
  source              = "./modules/monitoring"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  tags                = local.common_tags
}

module "data_lake" {
  source              = "./modules/data-lake"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  subnet_id           = module.networking.private_endpoints_subnet_id
  tags                = local.common_tags
}

module "cosmos_db" {
  source              = "./modules/cosmos-db"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  subnet_id           = module.networking.private_endpoints_subnet_id
  tags                = local.common_tags
}

module "postgresql" {
  source              = "./modules/postgresql"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  subnet_id           = module.networking.database_subnet_id
  admin_password      = var.postgresql_admin_password
  tags                = local.common_tags
}

module "event_hubs" {
  source              = "./modules/event-hubs"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  subnet_id           = module.networking.private_endpoints_subnet_id
  tags                = local.common_tags
}

module "cognitive_services" {
  source              = "./modules/cognitive-services"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  tags                = local.common_tags
}

module "databricks" {
  source              = "./modules/databricks"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  vnet_id             = module.networking.vnet_id
  tags                = local.common_tags
}

module "container_apps" {
  source                     = "./modules/container-apps"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = var.location
  environment                = var.environment
  subnet_id                  = module.networking.container_apps_subnet_id
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
  tags                       = local.common_tags
}

module "api_management" {
  source              = "./modules/api-management"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = var.environment
  tags                = local.common_tags
}

# ─── Locals ─────────────────────────────────────────────────

locals {
  common_tags = {
    project     = "markflow-ai"
    environment = var.environment
    managed_by  = "terraform"
  }
}
