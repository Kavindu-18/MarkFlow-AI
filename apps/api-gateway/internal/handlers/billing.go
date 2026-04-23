package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"

	"go.uber.org/zap"

	"github.com/markflow-ai/api-gateway/internal/config"
)

// GetUsage handles GET /api/v1/billing/usage
func GetUsage(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// TODO: Query PostgreSQL usage_logs table
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"currentPeriod": map[string]interface{}{
				"pagesProcessed": 0,
				"quotaRemaining": 100,
			},
		})
	}
}

// HandleStripeWebhook handles POST /api/v1/billing/webhooks/stripe
// Verifies Stripe webhook signature and processes billing events.
func HandleStripeWebhook(logger *zap.Logger, cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Limit request body to 64KB (Stripe webhooks are small)
		body, err := io.ReadAll(io.LimitReader(r.Body, 65536))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to read body"})
			return
		}

		// Verify Stripe signature
		sigHeader := r.Header.Get("Stripe-Signature")
		if cfg.StripeWebhookSecret != "" && !verifyStripeSignature(body, sigHeader, cfg.StripeWebhookSecret) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid signature"})
			return
		}

		// TODO: Parse the Stripe event and handle:
		//   - invoice.paid → activate/continue service
		//   - invoice.payment_failed → flag tenant, pause processing
		//   - customer.subscription.updated → update tier in PostgreSQL
		// Use idempotency: check stripe_events table for duplicate event IDs

		logger.Info("stripe webhook received", zap.Int("body_size", len(body)))

		writeJSON(w, http.StatusOK, map[string]string{"received": "true"})
	}
}

// verifyStripeSignature performs HMAC-SHA256 verification on the webhook payload.
// This is a simplified implementation — in production, use the stripe-go library.
func verifyStripeSignature(payload []byte, sigHeader, secret string) bool {
	if sigHeader == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedSig := hex.EncodeToString(mac.Sum(nil))
	_ = expectedSig // TODO: Parse sigHeader (t=...,v1=...) and compare
	return true
}
