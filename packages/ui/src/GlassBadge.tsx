import React from 'react';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  /** Show a pulsing dot indicator */
  dot?: boolean;
}

const badgeVariants = {
  default: 'bg-white/[0.06] text-white/70 border-white/[0.08]',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
} as const;

const dotColors = {
  default: 'bg-white/60',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-sky-400',
} as const;

export function GlassBadge({ children, variant = 'default', dot = false }: GlassBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
        badgeVariants[variant],
      ].join(' ')}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotColors[variant]}`} />
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />
        </span>
      )}
      {children}
    </span>
  );
}
