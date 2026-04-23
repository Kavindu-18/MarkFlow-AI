'use client';

import { useState, useCallback } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassSelect } from '@markflow/ui';
import type { ExamTemplate, Question, QuestionType, BoundingBox } from '@markflow/shared-types';
import { QuestionEditor } from './QuestionEditor';
import { ExamPreview } from './ExamPreview';

const PAGE_WIDTH = 612;
const CONTENT_MARGIN = 80;
const ANSWER_ZONE_WIDTH = PAGE_WIDTH - CONTENT_MARGIN * 2;

function generateId(): string {
  return crypto.randomUUID();
}

function defaultBoundingBox(order: number, page: number): BoundingBox {
  // Stack answer zones vertically, ~120pt each, starting at y=160
  const y = 160 + (order - 1) * 140;
  return { x: CONTENT_MARGIN, y, width: ANSWER_ZONE_WIDTH, height: 100, page };
}

export function ExamGeneratorForm() {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentIds, setStudentIds] = useState('');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [generating, setGenerating] = useState(false);

  const addQuestion = useCallback(() => {
    const order = questions.length + 1;
    const page = Math.ceil(order / 4); // ~4 questions per page
    const posOnPage = ((order - 1) % 4) + 1;
    const newQ: Question = {
      id: generateId(),
      order,
      type: 'text',
      prompt: '',
      points: 10,
      rubric: '',
      boundingBox: defaultBoundingBox(posOnPage, page),
    };
    setQuestions((prev) => [...prev, newQ]);
  }, [questions.length]);

  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    );
  }, []);

  const removeQuestion = useCallback((id: string) => {
    setQuestions((prev) =>
      prev
        .filter((q) => q.id !== id)
        .map((q, i) => ({ ...q, order: i + 1 })),
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!title || !subject || questions.length === 0) return;

    const ids = studentIds
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;

    setGenerating(true);
    try {
      // Dynamic import to avoid SSR issues with pdf-lib
      const { generateExamPdf } = await import('@markflow/pdf-engine');

      const totalPages = Math.max(...questions.map((q) => q.boundingBox.page), 1);
      const template: ExamTemplate = {
        id: generateId(),
        tenantId: 'local-dev',
        title,
        subject,
        totalPages,
        questions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const bytes = await generateExamPdf(template, { studentIds: ids });
      setPdfBytes(bytes);
    } finally {
      setGenerating(false);
    }
  }, [title, subject, questions, studentIds]);

  const handleDownload = useCallback(() => {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'exam'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfBytes, title]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Create Exam</h1>

      {/* Exam Metadata */}
      <GlassCard className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Exam Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <GlassInput
            label="Exam Title"
            placeholder="e.g., Midterm Exam — Biology 101"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <GlassInput
            label="Subject"
            placeholder="e.g., Biology"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      </GlassCard>

      {/* Questions */}
      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
          <GlassButton variant="secondary" size="sm" onClick={addQuestion}>
            + Add Question
          </GlassButton>
        </div>
        {questions.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-8">
            No questions yet. Click &quot;Add Question&quot; to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <QuestionEditor
                key={q.id}
                question={q}
                onUpdate={(updates) => updateQuestion(q.id, updates)}
                onRemove={() => removeQuestion(q.id)}
              />
            ))}
          </div>
        )}
      </GlassCard>

      {/* Student IDs */}
      <GlassCard className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Student IDs</h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/80" htmlFor="student-ids">
            Enter student IDs (one per line or comma-separated)
          </label>
          <textarea
            id="student-ids"
            className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-white placeholder:text-white/40 outline-none transition-all duration-200 focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 min-h-[100px] resize-y"
            placeholder={"STU001\nSTU002\nSTU003"}
            value={studentIds}
            onChange={(e) => setStudentIds(e.target.value)}
          />
        </div>
      </GlassCard>

      {/* Generate + Download */}
      <div className="flex gap-4">
        <GlassButton
          onClick={handleGenerate}
          loading={generating}
          disabled={!title || !subject || questions.length === 0 || !studentIds.trim()}
        >
          Generate PDF
        </GlassButton>
        {pdfBytes && (
          <GlassButton variant="secondary" onClick={handleDownload}>
            ⬇ Download PDF ({(pdfBytes.length / 1024).toFixed(0)} KB)
          </GlassButton>
        )}
      </div>

      {/* Preview */}
      {pdfBytes && <ExamPreview pdfBytes={pdfBytes} />}
    </div>
  );
}
