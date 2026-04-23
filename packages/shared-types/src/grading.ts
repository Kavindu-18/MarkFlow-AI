// ─── Grading Result Types ────────────────────────────────────────────────────

export type GradingStatus =
  | 'pending'
  | 'processing'
  | 'graded'
  | 'review_required'
  | 'overridden'
  | 'grading_failed';

export type SubmissionStatus =
  | 'uploaded'
  | 'splitting'
  | 'qr_failed'
  | 'assembled'
  | 'incomplete'
  | 'layout_parsed'
  | 'grading'
  | 'graded'
  | 'review_required';

export interface AIGradingResult {
  /** Score awarded (0 to question.points) */
  score: number;
  /** Specific, constructive feedback for the student */
  feedback: string;
  /** 0.0 – 1.0 confidence in the grade. < 0.85 triggers human review */
  confidence: number;
  /** Chain-of-thought reasoning from the LLM */
  reasoning: string;
}

export interface QuestionGradingResult {
  id: string;
  submissionId: string;
  questionId: string;
  examId: string;
  tenantId: string;
  /** URI of the cropped answer image in Data Lake */
  cropImageUri: string;
  /** Which AI service processed this: 'doc-intelligence' | 'gpt4o-vision' | 'mathpix+gpt4o' | 'deterministic' */
  processor: string;
  /** Raw extracted text/LaTeX before grading */
  extractedContent?: string;
  status: GradingStatus;
  aiResult?: AIGradingResult;
  /** Teacher override (if any) */
  override?: {
    score: number;
    feedback: string;
    overriddenBy: string;
    overriddenAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionPage {
  pageNumber: number;
  imageUri: string;
  qrDecoded: boolean;
}

export interface Submission {
  id: string;
  examId: string;
  tenantId: string;
  studentId: string;
  status: SubmissionStatus;
  pages: SubmissionPage[];
  /** Total score after all questions graded */
  totalScore?: number;
  /** Maximum possible score */
  maxScore?: number;
  /** Percentage grade (0–100) */
  percentage?: number;
  /** Minimum confidence across all question grades */
  overallConfidence?: number;
  uploadBatchId: string;
  createdAt: string;
  updatedAt: string;
}
