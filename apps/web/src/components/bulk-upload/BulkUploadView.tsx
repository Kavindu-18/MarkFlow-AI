'use client';

import { useState, useCallback, useRef } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassBadge } from '@markflow/ui';

type UploadStage = 'idle' | 'selected' | 'uploading' | 'processing' | 'done' | 'error';

interface UploadState {
  stage: UploadStage;
  file: File | null;
  examId: string;
  examTitle: string;
  progress: number;
  batchId: string | null;
  pageCount: number | null;
  error: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1';

export function BulkUploadView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>({
    stage: 'idle',
    file: null,
    examId: '',
    examTitle: '',
    progress: 0,
    batchId: null,
    pageCount: null,
    error: null,
  });

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      setState((s) => ({ ...s, error: 'Only PDF files are accepted.', stage: 'error' }));
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setState((s) => ({ ...s, error: 'File too large. Maximum size is 200 MB.', stage: 'error' }));
      return;
    }
    setState((s) => ({ ...s, file, stage: 'selected', error: null }));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleUpload = useCallback(async () => {
    if (!state.file || !state.examId) return;

    setState((s) => ({ ...s, stage: 'uploading', progress: 0, error: null }));

    try {
      // Step 1: Get pre-signed URL
      setState((s) => ({ ...s, progress: 10 }));

      const presignRes = await fetch(`${API_BASE}/uploads/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: state.examId, fileCount: 1 }),
      });

      if (!presignRes.ok) {
        throw new Error('Failed to get upload URL. Is the API gateway running?');
      }

      const { uploadBatchId, uploadUrls } = await presignRes.json();
      setState((s) => ({ ...s, progress: 30, batchId: uploadBatchId }));

      // Step 2: Upload PDF directly to Data Lake via SAS URL
      const uploadRes = await fetch(uploadUrls[0], {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
          'x-ms-blob-type': 'BlockBlob',
        },
        body: state.file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage.');
      }

      setState((s) => ({ ...s, progress: 70 }));

      // Step 3: Notify API that upload is complete → triggers pipeline
      const completeRes = await fetch(`${API_BASE}/uploads/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: state.examId,
          uploadBatchId,
          totalPages: 0, // Pipeline will detect actual page count
        }),
      });

      if (!completeRes.ok) {
        throw new Error('Failed to trigger processing pipeline.');
      }

      setState((s) => ({ ...s, progress: 100, stage: 'processing' }));

      // Simulate pipeline processing (in prod, poll for status)
      setTimeout(() => {
        setState((s) => ({ ...s, stage: 'done' }));
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setState((s) => ({ ...s, stage: 'error', error: message }));
    }
  }, [state.file, state.examId]);

  const reset = useCallback(() => {
    setState({
      stage: 'idle',
      file: null,
      examId: '',
      examTitle: '',
      progress: 0,
      batchId: null,
      pageCount: null,
      error: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk PDF Upload</h1>
        <p className="mt-1 text-sm text-white/30">
          Upload a multi-page PDF from your ADF scanner. All student answer sheets will be
          split, decoded, and graded automatically.
        </p>
      </div>

      {/* Exam Selection */}
      <GlassCard className="p-6 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Select Exam Template
        </h2>
        <p className="text-xs text-white/25 -mt-3">
          Choose the exam that was printed and distributed to students.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GlassInput
            label="Exam ID"
            placeholder="Paste exam ID from the Create page"
            value={state.examId}
            onChange={(e) => setState((s) => ({ ...s, examId: e.target.value }))}
          />
          <GlassInput
            label="Exam Title (optional)"
            placeholder="e.g., Midterm — Biology 101"
            value={state.examTitle}
            onChange={(e) => setState((s) => ({ ...s, examTitle: e.target.value }))}
          />
        </div>
      </GlassCard>

      {/* Drop Zone */}
      <GlassCard
        className={[
          'relative overflow-hidden transition-all duration-200',
          dragOver
            ? 'border-violet-500/40 bg-violet-500/[0.04] shadow-glow-sm'
            : '',
          state.stage === 'error'
            ? 'border-red-500/30'
            : '',
        ].join(' ')}
      >
        <div
          ref={dropRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center py-16 px-6 text-center"
        >
          {state.stage === 'idle' || state.stage === 'error' ? (
            <>
              {/* Upload icon */}
              <div className={[
                'flex h-16 w-16 items-center justify-center rounded-2xl mb-5 transition-colors',
                dragOver ? 'bg-violet-500/15' : 'bg-white/[0.04]',
              ].join(' ')}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={dragOver ? 'text-violet-400' : 'text-white/20'}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>

              <p className="text-sm text-white/50">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Choose a PDF
                </button>
                {' '}or drag and drop
              </p>
              <p className="mt-1 text-xs text-white/20">
                PDF up to 200 MB — typically 30-200 pages from an ADF scanner
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={onFileInput}
                className="hidden"
              />

              {state.error && (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5">
                  <p className="text-xs text-red-400">{state.error}</p>
                </div>
              )}
            </>
          ) : state.stage === 'selected' ? (
            <>
              {/* File preview */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>

              <p className="text-sm font-medium text-white/80">{state.file?.name}</p>
              <p className="mt-0.5 text-xs text-white/30">
                {((state.file?.size ?? 0) / (1024 * 1024)).toFixed(1)} MB
              </p>

              <div className="mt-5 flex items-center gap-3">
                <GlassButton
                  onClick={handleUpload}
                  disabled={!state.examId}
                  size="sm"
                >
                  Upload &amp; Process
                </GlassButton>
                <GlassButton variant="ghost" size="sm" onClick={reset}>
                  Remove
                </GlassButton>
              </div>

              {!state.examId && (
                <p className="mt-3 text-[11px] text-amber-400/70">Select an exam template above first.</p>
              )}
            </>
          ) : state.stage === 'uploading' ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 mb-5">
                <svg className="h-7 w-7 animate-spin text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>

              <p className="text-sm font-medium text-white/70">Uploading...</p>
              <p className="mt-0.5 text-xs text-white/30">{state.file?.name}</p>

              {/* Progress bar */}
              <div className="mt-5 w-full max-w-xs">
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700 ease-out"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-white/25 text-center">{state.progress}%</p>
              </div>
            </>
          ) : state.stage === 'processing' ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400 animate-pulse">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <p className="text-sm font-medium text-white/70">Processing with AI...</p>
              <p className="mt-0.5 text-xs text-white/30">
                Splitting pages, decoding QR codes, running AI grading
              </p>

              {/* Pipeline steps */}
              <div className="mt-6 flex items-center gap-2">
                {['Split', 'QR', 'Layout', 'Grade', 'Aggregate'].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={[
                      'rounded-lg px-2.5 py-1 text-[10px] font-semibold border transition-all duration-500',
                      i < 3
                        ? 'bg-violet-500/15 border-violet-500/25 text-violet-400'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/25',
                    ].join(' ')}>
                      {step}
                    </div>
                    {i < 4 && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10">
                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {state.batchId && (
                <p className="mt-4 text-[10px] text-white/15 font-mono">
                  batch: {state.batchId}
                </p>
              )}
            </>
          ) : state.stage === 'done' ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <p className="text-sm font-medium text-emerald-400">Grading Complete</p>
              <p className="mt-0.5 text-xs text-white/30">
                All student answer sheets have been processed.
              </p>

              <div className="mt-5 flex items-center gap-3">
                <a href="/grading">
                  <GlassButton size="sm">
                    View Results
                  </GlassButton>
                </a>
                <GlassButton variant="secondary" size="sm" onClick={reset}>
                  Upload Another
                </GlassButton>
              </div>

              {state.batchId && (
                <p className="mt-4 text-[10px] text-white/15 font-mono">
                  batch: {state.batchId}
                </p>
              )}
            </>
          ) : null}
        </div>
      </GlassCard>

      {/* How it works */}
      <GlassCard className="p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
          How Bulk Upload Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {[
            { num: '1', title: 'Scan', desc: 'Feed papers into your ADF scanner to produce a single multi-page PDF.' },
            { num: '2', title: 'Upload', desc: 'Drop the PDF here. It uploads directly to Azure Data Lake.' },
            { num: '3', title: 'Split', desc: 'Databricks splits the PDF into per-page images at 300 DPI.' },
            { num: '4', title: 'Decode', desc: 'QR codes on each page identify the student and exam.' },
            { num: '5', title: 'Grade', desc: 'Multi-agent AI grades every question and publishes results.' },
          ].map((step) => (
            <div key={step.num} className="text-center">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-bold text-violet-400 mb-2">
                {step.num}
              </div>
              <p className="text-xs font-semibold text-white/60">{step.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/25">{step.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
