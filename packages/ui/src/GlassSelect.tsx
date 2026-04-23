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
          <label htmlFor={selectId} className="text-sm font-medium text-white/80">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            'rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm',
            'px-4 py-2.5 text-white',
            'outline-none transition-all duration-200',
            'focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20',
            error ? 'border-red-400/60' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  },
);

GlassSelect.displayName = 'GlassSelect';
