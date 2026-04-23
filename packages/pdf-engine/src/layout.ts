import type { Question, QuestionType, AnswerZoneSize, BoundingBox } from '@markflow/shared-types';

// ─── Page layout constants (US Letter: 612 × 792 pt) ────────────────────────

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_MARGIN = 80;
const TOP_MARGIN_FIRST_PAGE = 160; // Extra space for header on page 1
const TOP_MARGIN_OTHER = 100;     // Subsequent pages start higher
const BOTTOM_MARGIN = 80;
const CONTENT_WIDTH = PAGE_WIDTH - CONTENT_MARGIN * 2;

/** Height reserved for the question prompt text above the answer zone */
const PROMPT_HEIGHT = 24;
/** Vertical gap between successive questions */
const QUESTION_GAP = 20;

// ─── Answer zone heights by size ─────────────────────────────────────────────

const ZONE_HEIGHTS: Record<AnswerZoneSize, number> = {
  small: 80,
  medium: 140,
  large: 240,
  'full-page': PAGE_HEIGHT - TOP_MARGIN_OTHER - BOTTOM_MARGIN - PROMPT_HEIGHT,
};

/** Default answer zone size for each question type */
const DEFAULT_ZONE_SIZE: Record<QuestionType, AnswerZoneSize> = {
  text: 'medium',
  equation: 'medium',
  diagram: 'large',
  checkbox: 'medium',
};

// ─── Public API ──────────────────────────────────────────────────────────────

export interface LayoutResult {
  questions: Question[];
  totalPages: number;
}

/**
 * Automatically lay out questions across pages.
 *
 * This function takes the ordered list of questions, computes how much vertical
 * space each one needs (prompt + answer zone), and flows them across pages —
 * starting a new page any time the next question won't fit.
 *
 * Full-page questions always get their own page.
 */
export function autoLayoutQuestions(questions: Question[]): LayoutResult {
  if (questions.length === 0) {
    return { questions: [], totalPages: 1 };
  }

  let currentPage = 1;
  let cursorY = TOP_MARGIN_FIRST_PAGE; // Y offset from top of current page

  const laid: Question[] = [];

  for (const q of questions) {
    const zoneSize = q.answerZoneSize ?? DEFAULT_ZONE_SIZE[q.type];
    let zoneHeight = ZONE_HEIGHTS[zoneSize];

    // For MCQ, ensure enough space for all options (28pt per option + 10pt padding)
    if (q.type === 'checkbox' && q.mcqOptions && q.mcqOptions.length > 0) {
      const mcqMinHeight = q.mcqOptions.length * 28 + 10;
      zoneHeight = Math.max(zoneHeight, mcqMinHeight);
    }

    const totalHeight = PROMPT_HEIGHT + zoneHeight;

    // Full-page questions always get a dedicated page
    if (zoneSize === 'full-page') {
      // If we already placed something on the current page, move to next
      const topMargin = currentPage === 1 ? TOP_MARGIN_FIRST_PAGE : TOP_MARGIN_OTHER;
      if (cursorY > topMargin) {
        currentPage++;
      }
      const pageTopMargin = currentPage === 1 ? TOP_MARGIN_FIRST_PAGE : TOP_MARGIN_OTHER;
      const bb: BoundingBox = {
        x: CONTENT_MARGIN,
        y: pageTopMargin + PROMPT_HEIGHT,
        width: CONTENT_WIDTH,
        height: zoneHeight,
        page: currentPage,
      };
      laid.push({ ...q, answerZoneSize: zoneSize, boundingBox: bb });
      // Force the next question onto a new page
      currentPage++;
      cursorY = currentPage === 1 ? TOP_MARGIN_FIRST_PAGE : TOP_MARGIN_OTHER;
      continue;
    }

    const pageBottomLimit = PAGE_HEIGHT - BOTTOM_MARGIN;

    // Would this question overflow the current page?
    if (cursorY + totalHeight > pageBottomLimit) {
      currentPage++;
      cursorY = currentPage === 1 ? TOP_MARGIN_FIRST_PAGE : TOP_MARGIN_OTHER;
    }

    const bb: BoundingBox = {
      x: CONTENT_MARGIN,
      y: cursorY + PROMPT_HEIGHT,
      width: CONTENT_WIDTH,
      height: zoneHeight,
      page: currentPage,
    };

    laid.push({ ...q, answerZoneSize: zoneSize, boundingBox: bb });
    cursorY += totalHeight + QUESTION_GAP;
  }

  const totalPages = Math.max(...laid.map((q) => q.boundingBox.page), 1);
  return { questions: laid, totalPages };
}

/**
 * Get the default answer zone size for a question type.
 */
export function getDefaultZoneSize(type: QuestionType): AnswerZoneSize {
  return DEFAULT_ZONE_SIZE[type];
}

/**
 * Get the height in points for a given answer zone size.
 */
export function getZoneHeight(size: AnswerZoneSize): number {
  return ZONE_HEIGHTS[size];
}

export { CONTENT_MARGIN, CONTENT_WIDTH, PAGE_WIDTH, PAGE_HEIGHT };
