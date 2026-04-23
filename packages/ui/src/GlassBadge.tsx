import React from 'react';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const badgeVariants = {
  default: 'bg-white/10 text-white/80 border-white/20',
  success: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  danger: 'bg-red-500/20 text-red-300 border-red-400/30',
  info: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
} as const;

export function GlassBadge({ children, variant = 'default' }: GlassBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        badgeVariants[variant],
      ].join(' ')}
    >
      {children}
    </span>
  );
}
