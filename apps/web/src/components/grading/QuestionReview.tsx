'use client';

import { useState } from 'react';
import { GlassCard, GlassButton, GlassBadge, GlassInput } from '@markflow/ui';
import type { QuestionGradingResult } from '@markflow/shared-types';

interface QuestionReviewProps {
  result: QuestionGradingResult;
  onOverride: (id: string, score: number, feedback: string) => void;
}

function confidenceColor(confidence: number): 'success' | 'warning' | 'danger' {
  if (confidence >= 0.85) return 'success';
  if (confidence >= 0.7) return 'warning';
  return 'danger';
}

export function QuestionReview({ result, onOverride }: QuestionReviewProps) {
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideScore, setOverrideScore] = useState(String(result.aiResult?.score ?? 0));
  const [overrideFeedback, setOverrideFeedback] = useState(result.aiResult?.feedback ?? '');

  const aiResult = result.aiResult;
  const isOverridden = result.status === 'overridden';

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold">Question {result.questionId}</span>
          <GlassBadge variant={result.processor === 'deterministic' ? 'info' : 'default'}>
            {result.processor}
          </GlassBadge>
          {aiResult && (
            <GlassBadge variant={confidenceColor(aiResult.confidence)}>
              {(aiResult.confidence * 100).toFixed(0)}% confidence
            </GlassBadge>
          )}
          {isOverridden && <GlassBadge variant="warning">Overridden</GlassBadge>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 divide-x divide-white/10">
        {/* Left: Student answer image */}
        <div className="p-4">
          <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">Student Answer</p>
          {result.cropImageUri ? (
            <img
              src={result.cropImageUri}
              alt="Student answer crop"
              className="w-full rounded-lg border border-white/10"
            />
          ) : (
            <div className="w-full aspect-[4/3] rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
              <span className="text-white/30 text-sm">No image available</span>
            </div>
          )}
          {result.extractedContent && (
            <div className="mt-3 p-2 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 mb-1">Extracted:</p>
              <p className="text-sm text-white/80 font-mono">{result.extractedContent}</p>
            </div>
          )}
        </div>

        {/* Center: AI grading result */}
        <div className="p-4">
          <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">AI Grade</p>
          {aiResult ? (
            <div className="space-y-3">
              <div className="text-center">
                <span className="text-4xl font-bold">{isOverridden ? result.override!.score : aiResult.score}</span>
                <span className="text-white/40 text-lg"> pts</span>
              </div>
              <div>
                <p className="text-xs text-white/50 mb-1">Feedback:</p>
                <p className="text-sm text-white/80">
                  {isOverridden ? result.override!.feedback : aiResult.feedback}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50 mb-1">Reasoning:</p>
                <p className="text-sm text-white/60 italic">{aiResult.reasoning}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/40">Grading pending...</p>
          )}
        </div>

        {/* Right: Override controls */}
        <div className="p-4">
          <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">Teacher Override</p>
          {!overrideMode ? (
            <div className="space-y-3">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setOverrideMode(true)}
                className="w-full"
              >
                ✏️ Override Grade
              </GlassButton>
              {aiResult && aiResult.confidence >= 0.85 && (
                <GlassButton variant="primary" size="sm" className="w-full">
                  ✅ Approve
                </GlassButton>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <GlassInput
                label="Corrected Score"
                type="number"
                min="0"
                value={overrideScore}
                onChange={(e) => setOverrideScore(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/80">Feedback</label>
                <textarea
                  className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-white placeholder:text-white/40 outline-none transition-all duration-200 focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 min-h-[80px] resize-y text-sm"
                  value={overrideFeedback}
                  onChange={(e) => setOverrideFeedback(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <GlassButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onOverride(result.id, Number(overrideScore), overrideFeedback);
                    setOverrideMode(false);
                  }}
                >
                  Save
                </GlassButton>
                <GlassButton variant="ghost" size="sm" onClick={() => setOverrideMode(false)}>
                  Cancel
                </GlassButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
