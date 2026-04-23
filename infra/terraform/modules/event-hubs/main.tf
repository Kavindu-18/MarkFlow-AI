variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "subnet_id" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_eventhub_namespace" "main" {
  name                     = "evhns-markflow-${var.environment}"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  sku                      = "Standard"
  capacity                 = 2
  auto_inflate_enabled     = true
  maximum_throughput_units = 10
  tags                     = var.tags
}

resource "azurerm_eventhub" "exam_uploaded" {
  name              = "exam-uploaded"
  namespace_id      = azurerm_eventhub_namespace.main.id
  partition_count   = 4
  message_retention = 7
}

resource "azurerm_eventhub" "page_processed" {
  name              = "page-processed"
  namespace_id      = azurerm_eventhub_namespace.main.id
  partition_count   = 4
  message_retention = 7
}

resource "azurerm_eventhub" "grading_requested" {
  name              = "grading-requested"
  namespace_id      = azurerm_eventhub_namespace.main.id
  partition_count   = 8
  message_retention = 7
}

resource "azurerm_eventhub" "grading_completed" {
  name              = "grading-completed"
  namespace_id      = azurerm_eventhub_namespace.main.id
  partition_count   = 4
  message_retention = 7
}

resource "azurerm_eventhub_consumer_group" "airflow" {
  name                = "airflow-consumer"
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = azurerm_eventhub.exam_uploaded.name
  resource_group_name = var.resource_group_name
}

resource "azurerm_eventhub_consumer_group" "api_gateway" {
  name                = "api-gateway-consumer"
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = azurerm_eventhub.grading_completed.name
  resource_group_name = var.resource_group_name
}

output "namespace_name" { value = azurerm_eventhub_namespace.main.name }
output "namespace_id" { value = azurerm_eventhub_namespace.main.id }
