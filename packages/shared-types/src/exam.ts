// ─── Exam Template Types ─────────────────────────────────────────────────────

export type QuestionType = 'text' | 'equation' | 'diagram' | 'checkbox';

/** Controls how much vertical space the answer zone takes on the printed page */
export type AnswerZoneSize = 'small' | 'medium' | 'large' | 'full-page';

export interface BoundingBox {
  /** X offset from left edge in points (1pt = 1/72 inch) */
  x: number;
  /** Y offset from top edge in points */
  y: number;
  /** Width in points */
  width: number;
  /** Height in points */
  height: number;
  /** Page number (1-indexed) this box appears on */
  page: number;
}

export interface Question {
  id: string;
  /** Display order (1-indexed) */
  order: number;
  type: QuestionType;
  /** Question text shown on the exam */
  prompt: string;
  /** Maximum points for this question */
  points: number;
  /** Teacher-authored rubric criteria */
  rubric: string;
  /** Optional reference answer (LaTeX for equations, text, or image URI for diagrams) */
  referenceAnswer?: string;
  /** How much vertical space the answer zone takes (default: auto-calculated from type) */
  answerZoneSize?: AnswerZoneSize;
  /** MCQ: list of choice labels (e.g. ["Mitosis", "Meiosis", "Both", "Neither"]) */
  mcqOptions?: string[];
  /** MCQ: 0-based index of the correct option (used for grading, not printed) */
  mcqCorrectIndex?: number;
  /** Region on the page where the student writes their answer */
  boundingBox: BoundingBox;
}

export interface ExamTemplate {
  id: string;
  tenantId: string;
  title: string;
  subject: string;
  /** Total number of pages per student copy */
  totalPages: number;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

// ─── QR Payload ──────────────────────────────────────────────────────────────

export interface QRPayload {
  examId: string;
  studentId: string;
  pageNumber: number;
  totalPages: number;
}

/** Encode QR payload into the standard delimited string */
export function encodeQRPayload(payload: QRPayload): string {
  return `${payload.examId}:${payload.studentId}:${payload.pageNumber}:${payload.totalPages}`;
}

/** Decode the delimited QR string back into a typed payload */
export function decodeQRPayload(raw: string): QRPayload {
  const parts = raw.split(':');
  if (parts.length !== 4) {
    throw new Error(`Invalid QR payload: expected 4 colon-separated segments, got ${parts.length}`);
  }
  const pageNumber = Number(parts[2]);
  const totalPages = Number(parts[3]);
  if (Number.isNaN(pageNumber) || Number.isNaN(totalPages)) {
    throw new Error('Invalid QR payload: pageNumber and totalPages must be numeric');
  }
  return {
    examId: parts[0],
    studentId: parts[1],
    pageNumber,
    totalPages,
  };
}
