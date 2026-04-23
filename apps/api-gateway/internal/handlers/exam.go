package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/markflow-ai/api-gateway/internal/middleware"
	"github.com/markflow-ai/api-gateway/internal/models"
)

// CreateExam handles POST /api/v1/exams
func CreateExam(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.ExamTemplate
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}

		// Set server-generated fields
		req.ID = uuid.New().String()
		req.CreatedAt = time.Now().UTC()
		req.UpdatedAt = req.CreatedAt

		// Extract tenant from JWT context
		if tid, ok := r.Context().Value(middleware.TenantIDKey).(string); ok {
			req.TenantID = tid
		}

		// TODO: Persist to Cosmos DB
		logger.Info("exam created",
			zap.String("exam_id", req.ID),
			zap.String("tenant_id", req.TenantID),
			zap.Int("question_count", len(req.Questions)),
		)

		writeJSON(w, http.StatusCreated, req)
	}
}

// GetExam handles GET /api/v1/exams/{examId}
func GetExam(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		examID := chi.URLParam(r, "examId")

		// TODO: Fetch from Cosmos DB
		logger.Info("get exam", zap.String("exam_id", examID))

		writeJSON(w, http.StatusOK, map[string]string{
			"id":      examID,
			"message": "TODO: Fetch from Cosmos DB",
		})
	}
}

// ListExams handles GET /api/v1/exams
func ListExams(logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// TODO: Query Cosmos DB by tenant ID
		writeJSON(w, http.StatusOK, []models.ExamTemplate{})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}
