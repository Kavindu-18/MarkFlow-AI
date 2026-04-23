package models

import "time"

// ExamTemplate mirrors the TypeScript ExamTemplate type.
type ExamTemplate struct {
	ID         string     `json:"id"`
	TenantID   string     `json:"tenantId"`
	Title      string     `json:"title"`
	Subject    string     `json:"subject"`
	TotalPages int        `json:"totalPages"`
	Questions  []Question `json:"questions"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

type Question struct {
	ID              string      `json:"id"`
	Order           int         `json:"order"`
	Type            string      `json:"type"` // text | equation | diagram | checkbox
	Prompt          string      `json:"prompt"`
	Points          int         `json:"points"`
	Rubric          string      `json:"rubric"`
	ReferenceAnswer string      `json:"referenceAnswer,omitempty"`
	BoundingBox     BoundingBox `json:"boundingBox"`
}

type BoundingBox struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Page   int     `json:"page"`
}

// Submission represents a student's scanned exam.
type Submission struct {
	ID                string           `json:"id"`
	ExamID            string           `json:"examId"`
	TenantID          string           `json:"tenantId"`
	StudentID         string           `json:"studentId"`
	Status            string           `json:"status"`
	Pages             []SubmissionPage `json:"pages"`
	TotalScore        *float64         `json:"totalScore,omitempty"`
	MaxScore          *float64         `json:"maxScore,omitempty"`
	Percentage        *float64         `json:"percentage,omitempty"`
	OverallConfidence *float64         `json:"overallConfidence,omitempty"`
	UploadBatchID     string           `json:"uploadBatchId"`
	CreatedAt         time.Time        `json:"createdAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
}

type SubmissionPage struct {
	PageNumber int    `json:"pageNumber"`
	ImageURI   string `json:"imageUri"`
	QRDecoded  bool   `json:"qrDecoded"`
}

// GradingResult for a single question.
type GradingResult struct {
	ID               string      `json:"id"`
	SubmissionID     string      `json:"submissionId"`
	QuestionID       string      `json:"questionId"`
	ExamID           string      `json:"examId"`
	TenantID         string      `json:"tenantId"`
	CropImageURI     string      `json:"cropImageUri"`
	Processor        string      `json:"processor"`
	ExtractedContent string      `json:"extractedContent,omitempty"`
	Status           string      `json:"status"`
	AIResult         *AIResult   `json:"aiResult,omitempty"`
	Override         *Override   `json:"override,omitempty"`
	CreatedAt        time.Time   `json:"createdAt"`
	UpdatedAt        time.Time   `json:"updatedAt"`
}

type AIResult struct {
	Score      float64 `json:"score"`
	Feedback   string  `json:"feedback"`
	Confidence float64 `json:"confidence"`
	Reasoning  string  `json:"reasoning"`
}

type Override struct {
	Score        float64   `json:"score"`
	Feedback     string    `json:"feedback"`
	OverriddenBy string    `json:"overriddenBy"`
	OverriddenAt time.Time `json:"overriddenAt"`
}
