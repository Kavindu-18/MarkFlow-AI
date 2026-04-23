'use client';

import { useState, useCallback, useRef } from 'react';
import { GlassCard, GlassButton, GlassInput } from '@markflow/ui';

interface StudentRosterProps {
  students: string[];
  onChange: (students: string[]) => void;
}

export function StudentRoster({ students, onChange }: StudentRosterProps) {
  const [newId, setNewId] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addStudent = useCallback(() => {
    const id = newId.trim();
    if (!id || students.includes(id)) return;
    onChange([...students, id]);
    setNewId('');
  }, [newId, students, onChange]);

  const removeStudent = useCallback(
    (id: string) => {
      onChange(students.filter((s) => s !== id));
    },
    [students, onChange],
  );

  const handleBulkAdd = useCallback(() => {
    const ids = bulkText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const unique = Array.from(new Set([...students, ...ids]));
    onChange(unique);
    setBulkText('');
    setBulkMode(false);
  }, [bulkText, students, onChange]);

  const handleCsvImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        // Parse CSV — take first column of each row, skip header if it looks non-numeric
        const lines = text.split(/\r?\n/).filter(Boolean);
        const ids: string[] = [];
        for (const line of lines) {
          const firstCol = line.split(',')[0].trim().replace(/^["']|["']$/g, '');
          if (firstCol && firstCol.toLowerCase() !== 'student id' && firstCol.toLowerCase() !== 'id') {
            ids.push(firstCol);
          }
        }
        const unique = Array.from(new Set([...students, ...ids]));
        onChange(unique);
      };
      reader.readAsText(file);
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [students, onChange],
  );

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  return (
    <GlassCard className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Student Roster
          </h2>
          {students.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-500/15 px-1.5 text-[10px] font-bold text-violet-400">
              {students.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h-2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10m-3-3 3 3 3-3" />
            </svg>
            Import CSV
          </GlassButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleCsvImport}
          />
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => setBulkMode(!bulkMode)}
          >
            {bulkMode ? 'Single Add' : 'Bulk Add'}
          </GlassButton>
        </div>
      </div>

      {/* Bulk entry mode */}
      {bulkMode ? (
        <div className="space-y-3">
          <textarea
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 focus:border-violet-500/40 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] min-h-[120px] resize-y font-mono"
            placeholder={"Paste student IDs — one per line, comma, or semicolon separated:\n\nSTU001\nSTU002\nSTU003"}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <GlassButton size="sm" onClick={handleBulkAdd} disabled={!bulkText.trim()}>
              Add All
            </GlassButton>
            <span className="text-xs text-white/30">
              {bulkText
                .split(/[\n,;]+/)
                .map((s) => s.trim())
                .filter(Boolean).length}{' '}
              IDs detected
            </span>
          </div>
        </div>
      ) : (
        /* Single entry */
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <GlassInput
              label="Add Student ID"
              placeholder="e.g., STU001"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addStudent();
                }
              }}
            />
          </div>
          <GlassButton size="sm" onClick={addStudent} disabled={!newId.trim()}>
            + Add
          </GlassButton>
        </div>
      )}

      {/* Student list */}
      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 0 1 3.24 17.5a4.125 4.125 0 0 1 7.533-2.493M15 19.128a9.38 9.38 0 0 1-2.625.372 9.337 9.337 0 0 1-6.14-2.326" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-sm text-white/25">No students added yet</p>
          <p className="text-xs text-white/15 mt-1">
            Add student IDs to generate individual exam papers with unique QR codes
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/30">
              Each student gets a separate paper with a unique QR code
            </p>
            <button
              onClick={clearAll}
              className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {students.map((id) => (
              <div
                key={id}
                className="group flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 transition-all hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M7 7h3v3H7zM7 14h3v3H7zM14 7h3v3h-3zM14 14h3v3h-3z" />
                    </svg>
                  </div>
                  <span className="text-xs font-mono text-white/70 truncate">{id}</span>
                </div>
                <button
                  onClick={() => removeStudent(id)}
                  className="ml-2 shrink-0 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
