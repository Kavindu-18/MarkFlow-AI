package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// GetSubmission handles GET /api/v1/submissions/{submissionId}
func GetSubmission(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		submissionID := chi.URLParam(r, "submissionId")
		// TODO: Fetch from Cosmos DB
		writeJSON(w, http.StatusOK, map[string]string{
			"id":      submissionID,
			"message": "TODO: Fetch from Cosmos DB",
		})
	}
}

// GetGradingResults handles GET /api/v1/submissions/{submissionId}/results
func GetGradingResults(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		submissionID := chi.URLParam(r, "submissionId")
		// TODO: Query Cosmos DB grading-results container by submissionId
		logger.Info("get grading results", zap.String("submission_id", submissionID))
		writeJSON(w, http.StatusOK, []interface{}{})
	}
}

// OverrideGrade handles POST /api/v1/submissions/{submissionId}/results/{resultId}/override
func OverrideGrade(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		submissionID := chi.URLParam(r, "submissionId")
		resultID := chi.URLParam(r, "resultId")
		// TODO: Update grading result in Cosmos DB with override
		logger.Info("grade overridden",
			zap.String("submission_id", submissionID),
			zap.String("result_id", resultID),
		)
		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "overridden",
			"id":      resultID,
		})
	}
}
