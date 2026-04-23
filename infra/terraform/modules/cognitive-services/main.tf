variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_cognitive_account" "doc_intelligence" {
  name                = "di-markflow-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  kind                = "FormRecognizer"
  sku_name            = "S0"
  tags                = var.tags
}

resource "azurerm_cognitive_account" "openai" {
  name                = "aoai-markflow-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  kind                = "OpenAI"
  sku_name            = "S0"
  tags                = var.tags
}

resource "azurerm_cognitive_deployment" "gpt4o" {
  name                 = "gpt-4o"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = "gpt-4o"
    version = "2024-08-06"
  }

  sku {
    name     = "Standard"
    capacity = 30 # 30K tokens per minute
  }
}

output "doc_intelligence_endpoint" { value = azurerm_cognitive_account.doc_intelligence.endpoint }
output "openai_endpoint" { value = azurerm_cognitive_account.openai.endpoint }
