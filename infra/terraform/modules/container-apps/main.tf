variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "subnet_id" { type = string }
variable "log_analytics_workspace_id" { type = string }
variable "tags" { type = map(string) }

resource "azurerm_container_app_environment" "main" {
  name                       = "cae-markflow-${var.environment}"
  resource_group_name        = var.resource_group_name
  location                   = var.location
  log_analytics_workspace_id = var.log_analytics_workspace_id
  infrastructure_subnet_id   = var.subnet_id

  tags = var.tags
}

resource "azurerm_container_app" "api_gateway" {
  name                         = "ca-api-gateway"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  template {
    min_replicas = 1
    max_replicas = 10

    container {
      name   = "api-gateway"
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" # Placeholder
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "PORT"
        value = "8080"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "http"
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = var.tags
}

resource "azurerm_container_app" "lti_service" {
  name                         = "ca-lti-service"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  template {
    min_replicas = 1
    max_replicas = 5

    container {
      name   = "lti-service"
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" # Placeholder
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "PORT"
        value = "8081"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8081
    transport        = "http"
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = var.tags
}

resource "azurerm_container_app" "web" {
  name                         = "ca-web"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  template {
    min_replicas = 1
    max_replicas = 5

    container {
      name   = "web"
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" # Placeholder
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "PORT"
        value = "3000"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "http"
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = var.tags
}

output "default_domain" { value = azurerm_container_app_environment.main.default_domain }
