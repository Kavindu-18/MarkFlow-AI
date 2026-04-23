import React from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-white/50">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'rounded-xl border bg-white/[0.04] backdrop-blur-sm',
            'h-10 px-4 text-sm text-white placeholder:text-white/25',
            'outline-none transition-all duration-200',
            'focus:border-violet-500/40 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]',
            error ? 'border-red-500/40' : 'border-white/[0.08]',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);

GlassInput.displayName = 'GlassInput';
