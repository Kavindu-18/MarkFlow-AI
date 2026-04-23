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
      <div className="mx-auto max-w-6xl space-y-8 p-8">
        <div className="flex items-center gap-4">
          <GlassButton variant="ghost" size="sm" onClick={() => setSelectedSubmissionId(null)}>
            ← Back
          </GlassButton>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Student {selectedSubmission.studentId}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              {selectedSubmission.overallConfidence != null && confidenceBadge(selectedSubmission.overallConfidence)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard className="p-5 text-center" glow>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Score</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {selectedSubmission.totalScore ?? '—'}
              <span className="text-base font-normal text-white/25"> / {selectedSubmission.maxScore ?? '—'}</span>
            </p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Percentage</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{selectedSubmission.percentage?.toFixed(1) ?? '—'}%</p>
          </GlassCard>
          <GlassCard className="p-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Confidence</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
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
            <GlassCard className="p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm text-white/25">No grading data loaded yet.</p>
              <p className="text-xs text-white/15 mt-1">Connect the API to fetch results.</p>
            </GlassCard>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grading Review</h1>
          <p className="mt-1 text-sm text-white/30">Review and approve AI-graded submissions.</p>
        </div>
        <div className="flex gap-3">
          <GlassButton variant="secondary" size="sm" onClick={handleBatchApprove}>
            Approve All ≥ 90%
          </GlassButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/15">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-white/30">No submissions to review</p>
          <p className="text-xs text-white/15 mt-1">
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
