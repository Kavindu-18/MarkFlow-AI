package config

import (
	"os"
	"strings"
)

type Config struct {
	Port           string
	AllowedOrigins []string

	// LTI platform registrations (stored in Key Vault in production)
	PlatformIssuer   string
	PlatformJWKSURL  string
	PlatformAuthURL  string
	PlatformTokenURL string
	ClientID         string

	// Tool configuration
	ToolPublicKeyPath  string
	ToolPrivateKeyPath string

	// MarkFlow API Gateway base URL (for user linking)
	APIGatewayURL string
}

func Load() (*Config, error) {
	return &Config{
		Port:               getEnv("PORT", "8081"),
		AllowedOrigins:     strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:3000"), ","),
		PlatformIssuer:     getEnv("LTI_PLATFORM_ISSUER", ""),
		PlatformJWKSURL:    getEnv("LTI_PLATFORM_JWKS_URL", ""),
		PlatformAuthURL:    getEnv("LTI_PLATFORM_AUTH_URL", ""),
		PlatformTokenURL:   getEnv("LTI_PLATFORM_TOKEN_URL", ""),
		ClientID:           getEnv("LTI_CLIENT_ID", ""),
		ToolPublicKeyPath:  getEnv("LTI_TOOL_PUBLIC_KEY_PATH", ""),
		ToolPrivateKeyPath: getEnv("LTI_TOOL_PRIVATE_KEY_PATH", ""),
		APIGatewayURL:      getEnv("API_GATEWAY_URL", "http://localhost:8080"),
	}, nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
