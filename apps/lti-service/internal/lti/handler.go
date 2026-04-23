package lti

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"

	"github.com/markflow-ai/lti-service/internal/config"
)

// Handler implements LTI 1.3 protocol endpoints.
type Handler struct {
	logger *zap.Logger
	cfg    *config.Config
}

func NewHandler(logger *zap.Logger, cfg *config.Config) *Handler {
	return &Handler{logger: logger, cfg: cfg}
}

// OIDCLoginInitiation handles GET /lti/login
// Step 1 of LTI 1.3: Redirect to the platform's authorization endpoint.
func (h *Handler) OIDCLoginInitiation(w http.ResponseWriter, r *http.Request) {
	iss := r.URL.Query().Get("iss")
	loginHint := r.URL.Query().Get("login_hint")
	targetLinkURI := r.URL.Query().Get("target_link_uri")
	ltiMessageHint := r.URL.Query().Get("lti_message_hint")

	if iss == "" || loginHint == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "iss and login_hint are required",
		})
		return
	}

	// Generate nonce and state for CSRF protection
	nonce := generateSecureRandom(32)
	state := generateSecureRandom(32)

	// TODO: Store nonce + state in a short-lived cache (Redis/Cosmos) for validation on /lti/launch

	// Build authorization redirect URL
	params := url.Values{
		"scope":              {"openid"},
		"response_type":      {"id_token"},
		"client_id":          {h.cfg.ClientID},
		"redirect_uri":       {fmt.Sprintf("%s/lti/launch", r.Host)},
		"login_hint":         {loginHint},
		"state":              {state},
		"nonce":              {nonce},
		"response_mode":      {"form_post"},
		"prompt":             {"none"},
	}
	if ltiMessageHint != "" {
		params.Set("lti_message_hint", ltiMessageHint)
	}
	if targetLinkURI != "" {
		params.Set("target_link_uri", targetLinkURI)
	}

	authURL := fmt.Sprintf("%s?%s", h.cfg.PlatformAuthURL, params.Encode())

	h.logger.Info("OIDC login initiation",
		zap.String("iss", iss),
		zap.String("login_hint", loginHint),
	)

	http.Redirect(w, r, authURL, http.StatusFound)
}

// Launch handles POST /lti/launch
// Step 2: Validate the ID token from the platform and establish the user session.
func (h *Handler) Launch(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid form data"})
		return
	}

	idToken := r.FormValue("id_token")
	state := r.FormValue("state")

	if idToken == "" || state == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "id_token and state are required",
		})
		return
	}

	// TODO: Validate the JWT id_token:
	// 1. Fetch JWKS from h.cfg.PlatformJWKSURL
	// 2. Verify signature, issuer, audience, nonce, expiration
	// 3. Extract LTI claims:
	//    - "sub" → LTI user ID
	//    - "https://purl.imsglobal.org/spec/lti/claim/message_type" → "LtiResourceLinkRequest"
	//    - "https://purl.imsglobal.org/spec/lti/claim/roles" → user roles
	//    - "https://purl.imsglobal.org/spec/lti/claim/context" → course context
	//    - "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint" → grade passback endpoint

	// TODO: Create or link the MarkFlow user account based on LTI user ID
	// TODO: Issue a MarkFlow session token and redirect to the dashboard

	h.logger.Info("LTI launch received", zap.String("state", state))

	// For now, redirect to the web app with a placeholder
	http.Redirect(w, r, "http://localhost:3000?lti_launch=success", http.StatusFound)
}

// JWKS handles GET /lti/jwks
// Serves the tool's public key for platforms to verify tool-signed messages.
func (h *Handler) JWKS(w http.ResponseWriter, r *http.Request) {
	// TODO: Load the tool's RSA public key and serve as JWKS
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"keys": []interface{}{},
	})
}

// DeepLink handles POST /lti/deeplink
// Returns content items (exam links) that can be embedded in the LMS.
func (h *Handler) DeepLink(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement LTI Deep Linking response
	// Return a signed JWT with content items pointing to specific exams
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "TODO: Deep linking response",
	})
}

// GradePassback handles POST /lti/grades/{submissionId}
// Sends a grade back to the LMS via LTI Assignment and Grade Services (AGS).
func (h *Handler) GradePassback(w http.ResponseWriter, r *http.Request) {
	submissionID := chi.URLParam(r, "submissionId")

	// TODO: Implement AGS grade passback:
	// 1. Look up the submission and its LTI context (lineItemUrl, etc.)
	// 2. Get an access token from the platform's token endpoint (client_credentials)
	// 3. POST the score to the lineItem scores endpoint

	h.logger.Info("grade passback requested", zap.String("submission_id", submissionID))

	writeJSON(w, http.StatusOK, map[string]string{
		"status":       "TODO",
		"submissionId": submissionID,
	})
}

func generateSecureRandom(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}
