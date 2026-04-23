package models

import "time"

// Events published to Azure Event Hubs.

type ExamUploadedEvent struct {
	EventID       string    `json:"eventId"`
	EventType     string    `json:"eventType"`
	TenantID      string    `json:"tenantId"`
	Timestamp     time.Time `json:"timestamp"`
	CorrelationID string    `json:"correlationId"`
	ExamID        string    `json:"examId"`
	UploadBatchID string    `json:"uploadBatchId"`
	SourceURI     string    `json:"sourceUri"`
	TotalFiles    int       `json:"totalFiles"`
}

type GradingCompletedEvent struct {
	EventID           string    `json:"eventId"`
	EventType         string    `json:"eventType"`
	TenantID          string    `json:"tenantId"`
	Timestamp         time.Time `json:"timestamp"`
	CorrelationID     string    `json:"correlationId"`
	ExamID            string    `json:"examId"`
	SubmissionID      string    `json:"submissionId"`
	TotalScore        float64   `json:"totalScore"`
	MaxScore          float64   `json:"maxScore"`
	OverallConfidence float64   `json:"overallConfidence"`
}
