'use client';

import { GlassCard, GlassButton, GlassInput, GlassSelect } from '@markflow/ui';
import type { Question, QuestionType } from '@markflow/shared-types';

const questionTypeOptions = [
  { value: 'text', label: 'Text Answer' },
  { value: 'equation', label: 'Equation / Math' },
  { value: 'diagram', label: 'Diagram / Drawing' },
  { value: 'checkbox', label: 'Checkbox / MCQ' },
];

interface QuestionEditorProps {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
  onRemove: () => void;
}

export function QuestionEditor({ question, onUpdate, onRemove }: QuestionEditorProps) {
  return (
    <GlassCard className="p-4 space-y-3 border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/60">
          Question {question.order} · Page {question.boundingBox.page}
        </span>
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
      </div>

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
