import React, { useEffect, useRef } from 'react';

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function GlassModal({ open, onClose, title, children }: GlassModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={[
        'rounded-2xl border border-white/20 bg-slate-900/80 backdrop-blur-xl',
        'shadow-2xl shadow-black/40 text-white',
        'p-0 max-w-lg w-full',
        'open:animate-in open:fade-in-0 open:zoom-in-95',
        'backdrop:bg-black/60 backdrop:backdrop-blur-sm',
      ].join(' ')}
    >
      <div className="p-6">
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
