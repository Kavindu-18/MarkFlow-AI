import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Control blur intensity: 'sm' | 'md' | 'lg' */
  blur?: 'sm' | 'md' | 'lg';
  /** Add a subtle colored border glow */
  glow?: boolean;
}

const blurMap = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
} as const;

export function GlassCard({
  children,
  blur = 'md',
  glow = false,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-white/20 bg-white/10 shadow-lg',
        blurMap[blur],
        glow ? 'shadow-indigo-500/10 border-indigo-400/30' : '',
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
