import React from 'react';

interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const GlassSelect = React.forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-white/50">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            'rounded-xl border bg-white/[0.04] backdrop-blur-sm',
            'h-10 px-4 text-sm text-white appearance-none',
            'outline-none transition-all duration-200',
            'focus:border-violet-500/40 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]',
            error ? 'border-red-500/40' : 'border-white/[0.08]',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);

GlassSelect.displayName = 'GlassSelect';
