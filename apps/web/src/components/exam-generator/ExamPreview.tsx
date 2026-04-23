'use client';

import { useMemo } from 'react';
import { GlassCard } from '@markflow/ui';

interface ExamPreviewProps {
  pdfBytes: Uint8Array;
}

export function ExamPreview({ pdfBytes }: ExamPreviewProps) {
  const objectUrl = useMemo(() => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }, [pdfBytes]);

  return (
    <GlassCard className="overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold">PDF Preview</h2>
      </div>
      <iframe
        src={objectUrl}
        title="Exam PDF Preview"
        className="w-full h-[600px] bg-white"
      />
    </GlassCard>
  );
}
