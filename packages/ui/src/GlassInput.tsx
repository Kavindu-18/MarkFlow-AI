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
          <label htmlFor={inputId} className="text-sm font-medium text-white/80">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm',
            'px-4 py-2.5 text-white placeholder:text-white/40',
            'outline-none transition-all duration-200',
            'focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20',
            error ? 'border-red-400/60' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  },
);

GlassInput.displayName = 'GlassInput';
