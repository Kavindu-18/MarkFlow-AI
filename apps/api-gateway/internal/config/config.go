package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port            string
	AllowedOrigins  []string

	// Azure AD B2C
	B2CTenantName string
	B2CClientID   string
	B2CPolicyName string

	// Azure Data Lake Storage Gen2
	StorageAccountName string
	StorageContainerName string

	// Azure Event Hubs
	EventHubNamespace   string
	EventHubName        string

	// Azure Cosmos DB
	CosmosEndpoint string
	CosmosKey      string
	CosmosDatabase string

	// PostgreSQL
	PostgresDSN string

	// Stripe
	StripeSecretKey     string
	StripeWebhookSecret string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:                 getEnvOrDefault("PORT", "8080"),
		AllowedOrigins:       strings.Split(getEnvOrDefault("ALLOWED_ORIGINS", "http://localhost:3000"), ","),

		B2CTenantName:        getEnvOrDefault("B2C_TENANT_NAME", ""),
		B2CClientID:          getEnvOrDefault("B2C_CLIENT_ID", ""),
		B2CPolicyName:        getEnvOrDefault("B2C_POLICY_NAME", "B2C_1_signupsignin"),

		StorageAccountName:   getEnvOrDefault("STORAGE_ACCOUNT_NAME", ""),
		StorageContainerName: getEnvOrDefault("STORAGE_CONTAINER_NAME", "raw-uploads"),

		EventHubNamespace:    getEnvOrDefault("EVENTHUB_NAMESPACE", ""),
		EventHubName:         getEnvOrDefault("EVENTHUB_NAME", "exam-uploaded"),

		CosmosEndpoint:       getEnvOrDefault("COSMOS_ENDPOINT", ""),
		CosmosKey:            getEnvOrDefault("COSMOS_KEY", ""),
		CosmosDatabase:       getEnvOrDefault("COSMOS_DATABASE", "markflow"),

		PostgresDSN:          getEnvOrDefault("POSTGRES_DSN", ""),

		StripeSecretKey:      getEnvOrDefault("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret:  getEnvOrDefault("STRIPE_WEBHOOK_SECRET", ""),
	}

	// In production, validate required fields
	if os.Getenv("APP_ENV") == "production" {
		if cfg.B2CTenantName == "" || cfg.B2CClientID == "" {
			return nil, fmt.Errorf("B2C_TENANT_NAME and B2C_CLIENT_ID are required in production")
		}
		if cfg.StorageAccountName == "" {
			return nil, fmt.Errorf("STORAGE_ACCOUNT_NAME is required in production")
		}
	}

	return cfg, nil
}

func getEnvOrDefault(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
