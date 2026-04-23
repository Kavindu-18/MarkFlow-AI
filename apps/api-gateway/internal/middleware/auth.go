package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserIDKey   contextKey = "userId"
	TenantIDKey contextKey = "tenantId"
	EmailKey    contextKey = "email"
)

// AuthenticateJWT validates Azure AD B2C JWT tokens from the Authorization header.
// In production, this fetches JWKS from the B2C discovery endpoint and validates
// the token signature, audience, and issuer. For now, it parses claims without
// full verification (TODO: add JWKS verification).
func AuthenticateJWT(tenantName, clientID, policyName string) func(next http.Handler) http.Handler {
	// B2C OpenID discovery URL:
	// https://{tenantName}.b2clogin.com/{tenantName}.onmicrosoft.com/{policyName}/v2.0/.well-known/openid-configuration
	issuer := fmt.Sprintf(
		"https://%s.b2clogin.com/%s.onmicrosoft.com/%s/v2.0",
		tenantName, tenantName, strings.ToLower(policyName),
	)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeError(w, http.StatusUnauthorized, "missing Authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				writeError(w, http.StatusUnauthorized, "invalid Authorization format")
				return
			}
			tokenStr := parts[1]

			// Parse token (in production, use jwt.Parse with JWKS keyfunc)
			parser := jwt.NewParser(
				jwt.WithIssuer(issuer),
				jwt.WithAudience(clientID),
				jwt.WithExpirationRequired(),
			)

			token, _, err := parser.ParseUnverified(tokenStr, jwt.MapClaims{})
			if err != nil {
				writeError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				writeError(w, http.StatusUnauthorized, "invalid token claims")
				return
			}

			// Extract user context from claims
			ctx := r.Context()
			if sub, ok := claims["sub"].(string); ok {
				ctx = context.WithValue(ctx, UserIDKey, sub)
			}
			if email, ok := claims["emails"].([]interface{}); ok && len(email) > 0 {
				if e, ok := email[0].(string); ok {
					ctx = context.WithValue(ctx, EmailKey, e)
				}
			}
			// Custom claim for tenant
			if tid, ok := claims["extension_tenantId"].(string); ok {
				ctx = context.WithValue(ctx, TenantIDKey, tid)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
