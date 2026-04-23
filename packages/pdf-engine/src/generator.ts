import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { ExamTemplate, QRPayload, Question } from '@markflow/shared-types';
import { drawFiducialMarkers } from './fiducials';
import { generateQRCodePng, QR_SIZE_PT } from './qr-encoder';

// Standard US Letter page size in points
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

// Layout constants
const CONTENT_MARGIN = 80; // Left margin for content (after fiducial markers)
const TOP_MARGIN = 100;
const BOTTOM_MARGIN = 80;
const QR_POSITION = { x: PAGE_WIDTH - 100, y: PAGE_HEIGHT - 90 }; // Top-right area

export interface GenerateExamPdfOptions {
  /** Student IDs to generate copies for */
  studentIds: string[];
}

/**
 * Generate a complete exam PDF with one copy per student.
 * Each page has:
 * - 4 corner fiducial markers for perspective transform
 * - A QR code encoding {examId}:{studentId}:{pageNumber}:{totalPages}
 * - Question prompts with designated answer zones
 *
 * @returns The raw PDF bytes ready for download
 */
export async function generateExamPdf(
  template: ExamTemplate,
  options: GenerateExamPdfOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Group questions by page
  const questionsByPage = new Map<number, Question[]>();
  for (const q of template.questions) {
    const page = q.boundingBox.page;
    if (!questionsByPage.has(page)) {
      questionsByPage.set(page, []);
    }
    questionsByPage.get(page)!.push(q);
  }

  const totalPages = template.totalPages;

  for (const studentId of options.studentIds) {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

      // 1. Draw fiducial markers at all four corners
      drawFiducialMarkers(page);

      // 2. Generate and embed QR code (top-right)
      const qrPayload: QRPayload = {
        examId: template.id,
        studentId,
        pageNumber: pageNum,
        totalPages,
      };
      const qrPng = await generateQRCodePng(qrPayload);
      const qrImage = await doc.embedPng(qrPng);
      page.drawImage(qrImage, {
        x: QR_POSITION.x,
        y: QR_POSITION.y,
        width: QR_SIZE_PT,
        height: QR_SIZE_PT,
      });

      // 3. Draw header (first page only)
      if (pageNum === 1) {
        page.drawText(template.title, {
          x: CONTENT_MARGIN,
          y: PAGE_HEIGHT - TOP_MARGIN,
          size: 18,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        page.drawText(`Subject: ${template.subject}`, {
          x: CONTENT_MARGIN,
          y: PAGE_HEIGHT - TOP_MARGIN - 24,
          size: 11,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        page.drawText(`Student ID: ${studentId}`, {
          x: CONTENT_MARGIN,
          y: PAGE_HEIGHT - TOP_MARGIN - 42,
          size: 11,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      // 4. Draw page number
      page.drawText(`Page ${pageNum} of ${totalPages}`, {
        x: PAGE_WIDTH / 2 - 30,
        y: BOTTOM_MARGIN / 2,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      // 5. Draw questions for this page
      const pageQuestions = questionsByPage.get(pageNum) ?? [];
      for (const question of pageQuestions) {
        const bb = question.boundingBox;
        // Convert bounding box from our coordinate system to PDF coords
        const pdfY = PAGE_HEIGHT - bb.y - bb.height;

        // Draw question prompt above the answer zone
        page.drawText(`Q${question.order}. ${question.prompt} [${question.points} pts]`, {
          x: bb.x,
          y: PAGE_HEIGHT - bb.y + 14,
          size: 10,
          font: boldFont,
          color: rgb(0, 0, 0),
          maxWidth: bb.width,
        });

        // Draw answer zone border (light gray dashed box)
        page.drawRectangle({
          x: bb.x,
          y: pdfY,
          width: bb.width,
          height: bb.height,
          borderColor: rgb(0.75, 0.75, 0.75),
          borderWidth: 0.5,
          color: rgb(0.98, 0.98, 0.98),
        });

        // Draw answer zone content
        if (question.type === 'checkbox' && question.mcqOptions && question.mcqOptions.length > 0) {
          // Render MCQ options as labelled bubbles
          const opts = question.mcqOptions;
          const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          const optionSpacing = Math.min(26, (bb.height - 10) / opts.length);
          for (let i = 0; i < opts.length; i++) {
            const optY = pdfY + bb.height - 16 - i * optionSpacing;
            // Draw bubble circle
            page.drawCircle({
              x: bb.x + 14,
              y: optY,
              size: 6,
              borderColor: rgb(0.4, 0.4, 0.4),
              borderWidth: 1,
              color: rgb(1, 1, 1),
            });
            // Draw option label and text
            const optText = opts[i] ? `${labels[i] ?? String(i + 1)}.  ${opts[i]}` : `${labels[i] ?? String(i + 1)}.`;
            page.drawText(optText, {
              x: bb.x + 28,
              y: optY - 4,
              size: 10,
              font,
              color: rgb(0.1, 0.1, 0.1),
              maxWidth: bb.width - 40,
            });
          }
        } else {
          const typeLabel =
            question.type === 'equation'
              ? 'Write equation here'
              : question.type === 'diagram'
                ? 'Draw diagram here'
                : 'Write answer here';

          page.drawText(typeLabel, {
            x: bb.x + 4,
            y: pdfY + bb.height - 14,
            size: 8,
            font,
            color: rgb(0.7, 0.7, 0.7),
          });
        }
      }
    }
  }

  return doc.save();
}

/**
 * Generate a single-student exam PDF.
 */
export async function generateSingleExamPdf(
  template: ExamTemplate,
  studentId: string,
): Promise<Uint8Array> {
  return generateExamPdf(template, { studentIds: [studentId] });
}
