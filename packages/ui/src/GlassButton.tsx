import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles = {
  primary:
    'bg-indigo-500/80 hover:bg-indigo-500/90 text-white border-indigo-400/40 shadow-indigo-500/20',
  secondary:
    'bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-white/5',
  danger:
    'bg-red-500/80 hover:bg-red-500/90 text-white border-red-400/40 shadow-red-500/20',
  ghost:
    'bg-transparent hover:bg-white/10 text-white/80 border-transparent',
} as const;

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-xl',
  lg: 'px-6 py-3 text-lg rounded-xl',
} as const;

export function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'border backdrop-blur-sm shadow-lg',
        'transition-all duration-200 ease-out',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.97]',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
