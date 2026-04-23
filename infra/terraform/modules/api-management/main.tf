variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_api_management" "main" {
  name                = "apim-markflow-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  publisher_name      = "MarkFlow AI"
  publisher_email     = "admin@markflow.ai"
  sku_name            = "Consumption_0"
  tags                = var.tags
}

resource "azurerm_api_management_product" "free" {
  product_id            = "free-tier"
  api_management_name   = azurerm_api_management.main.name
  resource_group_name   = var.resource_group_name
  display_name          = "Free Tier"
  description           = "100 pages/month, 10 req/min"
  subscription_required = true
  approval_required     = false
  published             = true
}

resource "azurerm_api_management_product" "pro" {
  product_id            = "pro-tier"
  api_management_name   = azurerm_api_management.main.name
  resource_group_name   = var.resource_group_name
  display_name          = "Pro Tier"
  description           = "10,000 pages/month, 100 req/min"
  subscription_required = true
  approval_required     = false
  published             = true
}

resource "azurerm_api_management_product" "enterprise" {
  product_id            = "enterprise-tier"
  api_management_name   = azurerm_api_management.main.name
  resource_group_name   = var.resource_group_name
  display_name          = "Enterprise Tier"
  description           = "Unlimited pages, 1000 req/min, custom SLA"
  subscription_required = true
  approval_required     = true
  published             = true
}

output "gateway_url" { value = azurerm_api_management.main.gateway_url }
