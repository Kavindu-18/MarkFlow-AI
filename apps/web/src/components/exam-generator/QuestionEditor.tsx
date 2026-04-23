'use client';

import { useCallback } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassSelect } from '@markflow/ui';
import type { Question, QuestionType, AnswerZoneSize } from '@markflow/shared-types';

const questionTypeOptions = [
  { value: 'text', label: 'Text Answer' },
  { value: 'equation', label: 'Equation / Math' },
  { value: 'diagram', label: 'Diagram / Drawing' },
  { value: 'checkbox', label: 'Checkbox / MCQ' },
];

const zoneSizeOptions = [
  { value: 'small', label: 'Small (2-3 lines)' },
  { value: 'medium', label: 'Medium (5-6 lines)' },
  { value: 'large', label: 'Large (diagram/essay)' },
  { value: 'full-page', label: 'Full Page' },
];

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface QuestionEditorProps {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
  onRemove: () => void;
}

export function QuestionEditor({ question, onUpdate, onRemove }: QuestionEditorProps) {
  const mcqOptions = question.mcqOptions ?? ['', '', '', ''];

  const updateOption = useCallback(
    (index: number, value: string) => {
      const updated = [...mcqOptions];
      updated[index] = value;
      onUpdate({ mcqOptions: updated });
    },
    [mcqOptions, onUpdate],
  );

  const addOption = useCallback(() => {
    if (mcqOptions.length >= 8) return;
    onUpdate({ mcqOptions: [...mcqOptions, ''] });
  }, [mcqOptions, onUpdate]);

  const removeOption = useCallback(
    (index: number) => {
      if (mcqOptions.length <= 2) return;
      const updated = mcqOptions.filter((_, i) => i !== index);
      const correctIdx = question.mcqCorrectIndex ?? 0;
      onUpdate({
        mcqOptions: updated,
        mcqCorrectIndex:
          index === correctIdx
            ? 0
            : index < correctIdx
              ? correctIdx - 1
              : correctIdx,
      });
    },
    [mcqOptions, question.mcqCorrectIndex, onUpdate],
  );

  return (
    <GlassCard className="p-4 space-y-3 border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-bold text-violet-400">
            {question.order}
          </span>
          <span className="text-sm font-medium text-white/60">
            Page {question.boundingBox.page}
          </span>
          <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/30">
            {question.answerZoneSize ?? 'medium'}
          </span>
        </div>
        <GlassButton variant="danger" size="sm" onClick={onRemove}>
          Remove
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <GlassInput
            label="Question Prompt"
            placeholder="e.g., Describe the process of photosynthesis."
            value={question.prompt}
            onChange={(e) => onUpdate({ prompt: e.target.value })}
          />
        </div>
        <GlassSelect
          label="Answer Type"
          options={questionTypeOptions}
          value={question.type}
          onChange={(e) => onUpdate({ type: e.target.value as QuestionType })}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <GlassInput
          label="Points"
          type="number"
          min="1"
          max="100"
          value={String(question.points)}
          onChange={(e) => onUpdate({ points: Number(e.target.value) || 1 })}
        />
        <GlassInput
          label="Rubric Criteria"
          placeholder="e.g., Must mention light reactions and Calvin cycle"
          value={question.rubric}
          onChange={(e) => onUpdate({ rubric: e.target.value })}
        />
        <GlassSelect
          label="Answer Space"
          options={zoneSizeOptions}
          value={question.answerZoneSize ?? 'medium'}
          onChange={(e) => onUpdate({ answerZoneSize: e.target.value as AnswerZoneSize })}
        />
      </div>

      {/* MCQ Options */}
      {question.type === 'checkbox' && (
        <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Answer Choices
            </p>
            {mcqOptions.length < 8 && (
              <button
                onClick={addOption}
                className="text-[10px] text-violet-400/70 hover:text-violet-400 transition-colors"
              >
                + Add Option
              </button>
            )}
          </div>
          <div className="space-y-2">
            {mcqOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                {/* Correct answer selector */}
                <button
                  type="button"
                  onClick={() => onUpdate({ mcqCorrectIndex: i })}
                  title={`Mark ${CHOICE_LABELS[i]} as correct answer`}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-all ${
                    (question.mcqCorrectIndex ?? 0) === i
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/30 hover:border-white/15 hover:text-white/50'
                  }`}
                >
                  {CHOICE_LABELS[i]}
                </button>
                {/* Option text input */}
                <input
                  className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-violet-500/40 focus:bg-white/[0.06]"
                  placeholder={`Option ${CHOICE_LABELS[i]}`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                {mcqOptions.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    className="shrink-0 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/20 mt-1">
            Click the letter to mark the correct answer (green = correct). This is stored for AI grading, not printed on the paper.
          </p>
        </div>
      )}

      {/* Reference answer for text/equation */}
      {(question.type === 'equation' || question.type === 'text') && (
        <GlassInput
          label="Reference Answer (optional)"
          placeholder={
            question.type === 'equation'
              ? 'e.g., E = mc^2'
              : 'e.g., Photosynthesis converts CO2 and water into glucose...'
          }
          value={question.referenceAnswer ?? ''}
          onChange={(e) => onUpdate({ referenceAnswer: e.target.value })}
        />
      )}
    </GlassCard>
  );
}
