package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/markflow-ai/api-gateway/internal/config"
	"github.com/markflow-ai/api-gateway/internal/middleware"
	"github.com/markflow-ai/api-gateway/internal/models"
)

type presignRequest struct {
	ExamID     string `json:"examId"`
	FileCount  int    `json:"fileCount"`
}

type presignResponse struct {
	UploadBatchID string   `json:"uploadBatchId"`
	UploadURLs    []string `json:"uploadUrls"`
	ExpiresAt     string   `json:"expiresAt"`
}

// GeneratePresignedURL handles POST /api/v1/uploads/presign
// Generates SAS URLs for direct-to-Data-Lake uploads from the frontend.
func GeneratePresignedURL(logger *zap.Logger, cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req presignRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}

		if req.ExamID == "" || req.FileCount < 1 || req.FileCount > 1000 {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "examId required, fileCount must be 1-1000",
			})
			return
		}

		tenantID, _ := r.Context().Value(middleware.TenantIDKey).(string)
		batchID := uuid.New().String()
		expiresAt := time.Now().UTC().Add(15 * time.Minute)

		// TODO: Generate actual Azure SAS URLs using azblob.
		// For now, return placeholder URLs showing the correct path structure.
		urls := make([]string, req.FileCount)
		for i := range urls {
			urls[i] = fmt.Sprintf(
				"https://%s.dfs.core.windows.net/%s/%s/%s/%s/file_%d.pdf?sas=placeholder",
				cfg.StorageAccountName,
				cfg.StorageContainerName,
				tenantID,
				req.ExamID,
				batchID,
				i+1,
			)
		}

		logger.Info("presigned URLs generated",
			zap.String("exam_id", req.ExamID),
			zap.String("batch_id", batchID),
			zap.Int("file_count", req.FileCount),
		)

		writeJSON(w, http.StatusOK, presignResponse{
			UploadBatchID: batchID,
			UploadURLs:    urls,
			ExpiresAt:     expiresAt.Format(time.RFC3339),
		})
	}
}

type completeUploadRequest struct {
	ExamID        string `json:"examId"`
	UploadBatchID string `json:"uploadBatchId"`
	TotalFiles    int    `json:"totalFiles"`
}

// CompleteUpload handles POST /api/v1/uploads/complete
// Publishes an ExamUploaded event to Event Hub after the frontend finishes uploading.
func CompleteUpload(logger *zap.Logger, cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req completeUploadRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}

		if req.ExamID == "" || req.UploadBatchID == "" || req.TotalFiles < 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "examId, uploadBatchId, and totalFiles are required",
			})
			return
		}

		tenantID, _ := r.Context().Value(middleware.TenantIDKey).(string)
		correlationID := uuid.New().String()

		event := models.ExamUploadedEvent{
			EventID:       uuid.New().String(),
			EventType:     "ExamUploaded",
			TenantID:      tenantID,
			Timestamp:     time.Now().UTC(),
			CorrelationID: correlationID,
			ExamID:        req.ExamID,
			UploadBatchID: req.UploadBatchID,
			SourceURI: fmt.Sprintf(
				"https://%s.dfs.core.windows.net/%s/%s/%s/%s/",
				cfg.StorageAccountName,
				cfg.StorageContainerName,
				tenantID,
				req.ExamID,
				req.UploadBatchID,
			),
			TotalFiles: req.TotalFiles,
		}

		// TODO: Publish event to Azure Event Hubs
		//   producer, _ := azeventhubs.NewProducerClient(cfg.EventHubNamespace, cfg.EventHubName, cred, nil)
		//   batch, _ := producer.NewEventDataBatch(ctx, nil)
		//   eventJSON, _ := json.Marshal(event)
		//   batch.AddEventData(&azeventhubs.EventData{Body: eventJSON}, nil)
		//   producer.SendEventDataBatch(ctx, batch, nil)

		logger.Info("upload complete, event published",
			zap.String("event_id", event.EventID),
			zap.String("exam_id", req.ExamID),
			zap.String("batch_id", req.UploadBatchID),
			zap.String("correlation_id", correlationID),
			zap.Int("total_files", req.TotalFiles),
		)

		writeJSON(w, http.StatusAccepted, map[string]string{
			"status":        "processing",
			"correlationId": correlationID,
			"eventId":       event.EventID,
		})
	}
}
