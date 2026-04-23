'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput } from '@markflow/ui';
import type { ExamTemplate, Question, AnswerZoneSize } from '@markflow/shared-types';
import { QuestionEditor } from './QuestionEditor';
import { StudentRoster } from './StudentRoster';
import { GenerationResults } from './GenerationResults';

function generateId(): string {
  return crypto.randomUUID();
}

type Step = 'details' | 'questions' | 'roster' | 'generate';

const STEPS: { key: Step; label: string; num: number }[] = [
  { key: 'details', label: 'Exam Details', num: 1 },
  { key: 'questions', label: 'Questions', num: 2 },
  { key: 'roster', label: 'Student Roster', num: 3 },
  { key: 'generate', label: 'Generate Papers', num: 4 },
];

/** Default answer zone size per question type */
const DEFAULT_ZONE: Record<string, AnswerZoneSize> = {
  text: 'medium',
  equation: 'medium',
  diagram: 'large',
  checkbox: 'medium',
};

export function ExamGeneratorForm() {
  const [step, setStep] = useState<Step>('details');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [generating, setGenerating] = useState(false);
  const [template, setTemplate] = useState<ExamTemplate | null>(null);

  // ─── Auto-layout: recalculate bounding boxes whenever questions change ─────
  useEffect(() => {
    if (questions.length === 0) return;
    let cancelled = false;
    (async () => {
      const { autoLayoutQuestions } = await import('@markflow/pdf-engine');
      if (cancelled) return;
      const { questions: laid } = autoLayoutQuestions(questions);
      // Only update if bounding boxes actually changed
      const changed = laid.some(
        (q, i) =>
          q.boundingBox.page !== questions[i]?.boundingBox.page ||
          q.boundingBox.y !== questions[i]?.boundingBox.y ||
          q.boundingBox.height !== questions[i]?.boundingBox.height,
      );
      if (changed && !cancelled) {
        setQuestions(laid);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.map((q) => `${q.id}:${q.type}:${q.answerZoneSize}`).join(',')]);

  // ─── Derived state ─────────────────────────────────────────────────────────
  const totalPages = useMemo(
    () => (questions.length > 0 ? Math.max(...questions.map((q) => q.boundingBox.page), 1) : 1),
    [questions],
  );

  const questionsByPage = useMemo(() => {
    const map = new Map<number, Question[]>();
    for (const q of questions) {
      const p = q.boundingBox.page;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(q);
    }
    return map;
  }, [questions]);

  const canProceed = useMemo(() => {
    switch (step) {
      case 'details':
        return title.trim() !== '' && subject.trim() !== '';
      case 'questions':
        return questions.length > 0 && questions.every((q) => q.prompt.trim() !== '');
      case 'roster':
        return studentIds.length > 0;
      default:
        return true;
    }
  }, [step, title, subject, questions, studentIds]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // ─── Question CRUD ─────────────────────────────────────────────────────────
  const addQuestion = useCallback(() => {
    const order = questions.length + 1;
    const newQ: Question = {
      id: generateId(),
      order,
      type: 'text',
      prompt: '',
      points: 10,
      rubric: '',
      answerZoneSize: 'medium',
      boundingBox: { x: 80, y: 0, width: 452, height: 140, page: 1 }, // placeholder — layout will fix
    };
    setQuestions((prev) => [...prev, newQ]);
  }, [questions.length]);

  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated = { ...q, ...updates };
        // If type changed, adjust defaults
        if (updates.type && !updates.answerZoneSize) {
          updated.answerZoneSize = DEFAULT_ZONE[updates.type] ?? 'medium';
        }
        // When switching to MCQ, initialize options if not present
        if (updates.type === 'checkbox' && !q.mcqOptions?.length) {
          updated.mcqOptions = ['', '', '', ''];
          updated.mcqCorrectIndex = 0;
        }
        return updated;
      }),
    );
  }, []);

  const removeQuestion = useCallback((id: string) => {
    setQuestions((prev) =>
      prev
        .filter((q) => q.id !== id)
        .map((q, i) => ({ ...q, order: i + 1 })),
    );
  }, []);

  // ─── PDF generation ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!title || !subject || questions.length === 0 || studentIds.length === 0) return;

    setGenerating(true);
    try {
      const { generateExamPdf, autoLayoutQuestions } = await import('@markflow/pdf-engine');

      const { questions: finalQuestions, totalPages: tp } = autoLayoutQuestions(questions);
      const tmpl: ExamTemplate = {
        id: generateId(),
        tenantId: 'local-dev',
        title,
        subject,
        totalPages: tp,
        questions: finalQuestions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const bytes = await generateExamPdf(tmpl, { studentIds });
      setPdfBytes(bytes);
      setTemplate(tmpl);
    } finally {
      setGenerating(false);
    }
  }, [title, subject, questions, studentIds]);

  const goNext = useCallback(() => {
    const idx = stepIndex;
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1].key);
    }
  }, [stepIndex]);

  const goBack = useCallback(() => {
    const idx = stepIndex;
    if (idx > 0) {
      setStep(STEPS[idx - 1].key);
      // Clear generated PDFs when going back
      setPdfBytes(null);
      setTemplate(null);
    }
  }, [stepIndex]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Exam</h1>
          <p className="mt-1 text-sm text-white/30">
            Design your exam &middot; Each student gets a unique QR-coded paper
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => {
                if (i <= stepIndex) setStep(s.key);
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all w-full ${
                s.key === step
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                  : i < stepIndex
                    ? 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.06] cursor-pointer'
                    : 'bg-white/[0.02] text-white/20 border border-white/[0.04] cursor-default'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  i < stepIndex
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : s.key === step
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-white/[0.06] text-white/30'
                }`}
              >
                {i < stepIndex ? '✓' : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 shrink-0 ${i < stepIndex ? 'bg-emerald-500/30' : 'bg-white/[0.06]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Exam Details */}
      {step === 'details' && (
        <GlassCard className="p-6 space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Exam Details
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
      )}

      {/* Step 2: Questions */}
      {step === 'questions' && (
        <div className="space-y-5">
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
                  Questions
                </h2>
                {questions.length > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-500/15 px-1.5 text-[10px] font-bold text-violet-400">
                    {questions.length}
                  </span>
                )}
                {questions.length > 0 && (
                  <span className="flex h-5 items-center rounded-full bg-white/[0.04] px-2 text-[10px] text-white/30">
                    {totalPages} page{totalPages > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <GlassButton variant="secondary" size="sm" onClick={addQuestion}>
                + Add Question
              </GlassButton>
            </div>
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <p className="text-sm text-white/25">No questions yet</p>
                <p className="text-xs text-white/15 mt-1">Click &quot;Add Question&quot; to get started</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Array.from(questionsByPage.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([pageNum, pageQuestions]) => (
                    <div key={pageNum} className="space-y-3">
                      {/* Page divider */}
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/[0.06]" />
                        <span className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/30">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                          Page {pageNum} · {pageQuestions.length} question{pageQuestions.length > 1 ? 's' : ''}
                        </span>
                        <div className="h-px flex-1 bg-white/[0.06]" />
                      </div>
                      {pageQuestions.map((q) => (
                        <QuestionEditor
                          key={q.id}
                          question={q}
                          onUpdate={(updates) => updateQuestion(q.id, updates)}
                          onRemove={() => removeQuestion(q.id)}
                        />
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </GlassCard>

          {/* Answer space guide */}
          {questions.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-2">Answer Space Guide</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Small', desc: '~2-3 lines', color: 'text-sky-400' },
                  { label: 'Medium', desc: '~5-6 lines', color: 'text-violet-400' },
                  { label: 'Large', desc: 'Essay / diagram', color: 'text-indigo-400' },
                  { label: 'Full Page', desc: 'Dedicated page', color: 'text-pink-400' },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-white/[0.03] px-3 py-2 text-center">
                    <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
                    <p className="text-[10px] text-white/25">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Student Roster */}
      {step === 'roster' && (
        <StudentRoster students={studentIds} onChange={setStudentIds} />
      )}

      {/* Step 4: Generate */}
      {step === 'generate' && (
        <div className="space-y-6">
          {/* Summary before generation */}
          {!pdfBytes && (
            <GlassCard className="p-6 space-y-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
                Generation Summary
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                  <p className="text-2xl font-bold text-violet-400">{studentIds.length}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Students</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-400">{questions.length}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Questions</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                  <p className="text-2xl font-bold text-sky-400">
                    {totalPages}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Pages/Student</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {studentIds.length * totalPages}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Total Pages</p>
                </div>
              </div>

              {/* How it works */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs font-medium text-white/50 mb-3">What happens when you generate:</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-400">1</span>
                    <p className="text-[11px] leading-relaxed text-white/40">
                      Each student gets their own copy of the exam paper
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-400">2</span>
                    <p className="text-[11px] leading-relaxed text-white/40">
                      Every page embeds a unique QR code: <span className="font-mono text-violet-400/60">examId:studentId:page</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-400">3</span>
                    <p className="text-[11px] leading-relaxed text-white/40">
                      After scanning, the AI pipeline reads the QR to identify each student&apos;s answers
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <GlassButton
                  onClick={handleGenerate}
                  loading={generating}
                  disabled={generating}
                >
                  {generating ? (
                    `Generating ${studentIds.length} papers...`
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      Generate {studentIds.length} Individual Papers
                    </>
                  )}
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {/* Results */}
          {pdfBytes && template && (
            <GenerationResults
              template={template}
              studentIds={studentIds}
              combinedPdfBytes={pdfBytes}
            />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <div>
          {stepIndex > 0 && (
            <GlassButton variant="secondary" size="sm" onClick={goBack}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Back
            </GlassButton>
          )}
        </div>
        <div>
          {stepIndex < STEPS.length - 1 && (
            <GlassButton size="sm" onClick={goNext} disabled={!canProceed}>
              Next: {STEPS[stepIndex + 1].label}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </GlassButton>
          )}
        </div>
      </div>
    </div>
  );
}
