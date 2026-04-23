'use client';

import { useState } from 'react';
import { GlassCard, GlassButton, GlassBadge, GlassTable } from '@markflow/ui';
import type { Submission, QuestionGradingResult } from '@markflow/shared-types';
import { QuestionReview } from './QuestionReview';

// Placeholder data — replaced by API calls in production
const MOCK_SUBMISSIONS: Submission[] = [];

interface ReviewDashboardProps {
  /** Filter to only show submissions needing review */
  reviewOnly?: boolean;
}

function confidenceBadge(confidence: number) {
  if (confidence >= 0.85)
    return <GlassBadge variant="success">{(confidence * 100).toFixed(0)}%</GlassBadge>;
  if (confidence >= 0.7)
    return <GlassBadge variant="warning">{(confidence * 100).toFixed(0)}%</GlassBadge>;
  return <GlassBadge variant="danger">{(confidence * 100).toFixed(0)}%</GlassBadge>;
}

function statusBadge(status: Submission['status']) {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    graded: 'success',
    review_required: 'warning',
    grading: 'info',
    incomplete: 'danger',
    uploaded: 'default',
  };
  return <GlassBadge variant={variants[status] ?? 'default'}>{status.replace('_', ' ')}</GlassBadge>;
}

export function ReviewDashboard({ reviewOnly = false }: ReviewDashboardProps) {
  const [submissions, setSubmissions] = useState<Submission[]>(MOCK_SUBMISSIONS);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionGradingResult[]>([]);

  const filtered = reviewOnly
    ? submissions.filter((s) => s.status === 'review_required' || (s.overallConfidence ?? 1) < 0.85)
    : submissions;

  const selectedSubmission = submissions.find((s) => s.id === selectedSubmissionId);

  const handleBatchApprove = () => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.status === 'review_required' && (s.overallConfidence ?? 0) >= 0.9
          ? { ...s, status: 'graded' as const }
          : s,
      ),
    );
  };

  if (selectedSubmission) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center gap-4">
          <GlassButton variant="ghost" size="sm" onClick={() => setSelectedSubmissionId(null)}>
            ← Back to list
          </GlassButton>
          <h1 className="text-2xl font-bold">
            Review: Student {selectedSubmission.studentId}
          </h1>
          {selectedSubmission.overallConfidence != null && confidenceBadge(selectedSubmission.overallConfidence)}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard className="p-4 text-center">
            <p className="text-sm text-white/60">Score</p>
            <p className="text-3xl font-bold">
              {selectedSubmission.totalScore ?? '—'} / {selectedSubmission.maxScore ?? '—'}
            </p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-sm text-white/60">Percentage</p>
            <p className="text-3xl font-bold">{selectedSubmission.percentage?.toFixed(1) ?? '—'}%</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-sm text-white/60">Confidence</p>
            <p className="text-3xl font-bold">
              {selectedSubmission.overallConfidence != null
                ? `${(selectedSubmission.overallConfidence * 100).toFixed(0)}%`
                : '—'}
            </p>
          </GlassCard>
        </div>

        <div className="space-y-4">
          {questionResults.map((qr) => (
            <QuestionReview
              key={qr.id}
              result={qr}
              onOverride={(id, score, feedback) => {
                setQuestionResults((prev) =>
                  prev.map((r) =>
                    r.id === id
                      ? {
                          ...r,
                          status: 'overridden' as const,
                          override: {
                            score,
                            feedback,
                            overriddenBy: 'current-teacher',
                            overriddenAt: new Date().toISOString(),
                          },
                        }
                      : r,
                  ),
                );
              }}
            />
          ))}
          {questionResults.length === 0 && (
            <GlassCard className="p-8 text-center">
              <p className="text-white/40">No question results loaded. Connect to the API to fetch grading data.</p>
            </GlassCard>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Grading Review</h1>
        <div className="flex gap-3">
          <GlassButton variant="secondary" size="sm" onClick={handleBatchApprove}>
            ✅ Approve All ≥ 90% Confidence
          </GlassButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <p className="text-xl text-white/40 mb-2">No submissions to review</p>
          <p className="text-sm text-white/30">
            {reviewOnly
              ? 'All graded submissions have confidence ≥ 85%.'
              : 'No submissions have been processed yet.'}
          </p>
        </GlassCard>
      ) : (
        <GlassTable
          columns={[
            { key: 'studentId', header: 'Student' },
            {
              key: 'status',
              header: 'Status',
              render: (item: Submission) => statusBadge(item.status),
            },
            {
              key: 'totalScore',
              header: 'Score',
              render: (item: Submission) => (
                <span>{item.totalScore ?? '—'} / {item.maxScore ?? '—'}</span>
              ),
            },
            {
              key: 'percentage',
              header: 'Percentage',
              render: (item: Submission) => (
                <span>{item.percentage?.toFixed(1) ?? '—'}%</span>
              ),
            },
            {
              key: 'overallConfidence',
              header: 'Confidence',
              render: (item: Submission) =>
                item.overallConfidence != null
                  ? confidenceBadge(item.overallConfidence)
                  : <span className="text-white/40">—</span>,
            },
          ]}
          data={filtered as (Submission & Record<string, unknown>)[]}
          keyExtractor={(item) => (item as unknown as Submission).id}
          onRowClick={(item) => setSelectedSubmissionId((item as unknown as Submission).id)}
          emptyMessage="No submissions match the current filter."
        />
      )}
    </div>
  );
}
