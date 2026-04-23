import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles = {
  primary:
    'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-violet-400/20 shadow-glow-sm hover:shadow-glow',
  secondary:
    'bg-white/[0.06] hover:bg-white/[0.10] text-white/90 border-white/[0.08] hover:border-white/[0.15]',
  danger:
    'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border-red-400/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:shadow-[0_0_30px_rgba(239,68,68,0.25)]',
  ghost:
    'bg-transparent hover:bg-white/[0.06] text-white/60 hover:text-white border-transparent',
} as const;

const sizeStyles = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
} as const;

export function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-medium tracking-tight',
        'border backdrop-blur-sm',
        'transition-all duration-200 ease-out',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
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
      {loading ? (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
