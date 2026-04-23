import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  blur?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  /** Animated gradient border */
  accent?: boolean;
  /** Hover lift effect */
  hover?: boolean;
}

const blurMap = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-xl',
  lg: 'backdrop-blur-2xl',
} as const;

export function GlassCard({
  children,
  blur = 'md',
  glow = false,
  accent = false,
  hover = false,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <div
      className={[
        'relative rounded-2xl border bg-white/[0.03] shadow-glass',
        blurMap[blur],
        // Inner top highlight
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        glow
          ? 'border-violet-500/20 shadow-glow-sm'
          : 'border-white/[0.08]',
        accent ? 'gradient-border' : '',
        hover
          ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-glow hover:border-violet-500/20 hover:bg-white/[0.05]'
          : 'transition-colors duration-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
