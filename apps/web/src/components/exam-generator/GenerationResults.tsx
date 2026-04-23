'use client';

import { useState, useCallback } from 'react';
import { GlassCard, GlassButton } from '@markflow/ui';
import type { ExamTemplate } from '@markflow/shared-types';

interface GenerationResultsProps {
  template: ExamTemplate;
  studentIds: string[];
  /** The combined PDF with all students */
  combinedPdfBytes: Uint8Array;
}

function toBlob(bytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}

export function GenerationResults({
  template,
  studentIds,
  combinedPdfBytes,
}: GenerationResultsProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const pagesPerStudent = template.totalPages;
  const totalPages = pagesPerStudent * studentIds.length;

  const downloadCombined = useCallback(() => {
    const blob = toBlob(combinedPdfBytes);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.title || 'exam'}-all-students.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [combinedPdfBytes, template.title]);

  const downloadSingle = useCallback(
    async (studentId: string) => {
      setGeneratingId(studentId);
      try {
        const { generateSingleExamPdf } = await import('@markflow/pdf-engine');
        const bytes = await generateSingleExamPdf(template, studentId);
        const blob = toBlob(bytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.title || 'exam'}-${studentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } finally {
        setGeneratingId(null);
      }
    },
    [template],
  );

  return (
    <GlassCard className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Generated Papers
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {studentIds.length} students &middot; {pagesPerStudent} page{pagesPerStudent > 1 ? 's' : ''} each &middot; {totalPages} total pages
          </p>
        </div>
        <GlassButton size="sm" onClick={downloadCombined}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0-5-5m5 5 5-5" />
            <path strokeLinecap="round" d="M4 19h16" />
          </svg>
          Download All ({(combinedPdfBytes.length / 1024).toFixed(0)} KB)
        </GlassButton>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-violet-500/10 bg-violet-500/[0.04] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 7h3v3H7zM7 14h3v3H7zM14 7h3v3h-3zM14 14h3v3h-3z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-violet-300/80">Unique QR Codes</p>
            <p className="text-[11px] leading-relaxed text-white/40 mt-0.5">
              Every page has a unique QR code encoding <span className="font-mono text-violet-400/60">examId:studentId:page:total</span>. 
              When scanned, the AI pipeline automatically identifies which student&apos;s paper it is and routes it for grading.
            </p>
          </div>
        </div>
      </div>

      {/* Per-student list */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
          <span>Student ID</span>
          <span className="text-right">Pages</span>
          <span className="w-20 text-center">Download</span>
        </div>
        <div className="max-h-[320px] overflow-y-auto space-y-1 scrollbar-thin">
          {studentIds.map((id, index) => (
            <div
              key={id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition-all hover:border-white/[0.08] hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-bold text-white/30">
                  {index + 1}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-violet-400/50">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M7 7h3v3H7zM7 14h3v3H7zM14 7h3v3h-3zM14 14h3v3h-3z" />
                  </svg>
                  <span className="font-mono text-sm text-white/70 truncate">{id}</span>
                </div>
              </div>
              <span className="text-xs text-white/40 tabular-nums">
                {pagesPerStudent} pg
              </span>
              <button
                onClick={() => downloadSingle(id)}
                disabled={generatingId === id}
                className="flex w-20 items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[11px] text-white/50 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300 disabled:opacity-40"
              >
                {generatingId === id ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M12 5v14m0 0-4-4m4 4 4-4" />
                  </svg>
                )}
                PDF
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Combined PDF preview */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06]">
        <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Combined PDF Preview
          </h3>
        </div>
        <iframe
          src={URL.createObjectURL(toBlob(combinedPdfBytes))}
          title="Exam PDF Preview"
          className="w-full h-[500px] bg-white"
        />
      </div>
    </GlassCard>
  );
}
