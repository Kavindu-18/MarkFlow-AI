// ─── Event Types (Event Hub Messages) ────────────────────────────────────────

export interface BaseEvent {
  eventId: string;
  eventType: string;
  tenantId: string;
  timestamp: string;
  correlationId: string;
}

export interface ExamUploadedEvent extends BaseEvent {
  eventType: 'ExamUploaded';
  examId: string;
  uploadBatchId: string;
  /** Data Lake URI to the raw upload */
  sourceUri: string;
  totalFiles: number;
}

export interface PageProcessedEvent extends BaseEvent {
  eventType: 'PageProcessed';
  examId: string;
  submissionId: string;
  pageNumber: number;
  imageUri: string;
}

export interface GradingRequestedEvent extends BaseEvent {
  eventType: 'GradingRequested';
  examId: string;
  submissionId: string;
  questionId: string;
  cropUri: string;
  processor: string;
}

export interface GradingCompletedEvent extends BaseEvent {
  eventType: 'GradingCompleted';
  examId: string;
  submissionId: string;
  totalScore: number;
  maxScore: number;
  overallConfidence: number;
}

export type MarkFlowEvent =
  | ExamUploadedEvent
  | PageProcessedEvent
  | GradingRequestedEvent
  | GradingCompletedEvent;
