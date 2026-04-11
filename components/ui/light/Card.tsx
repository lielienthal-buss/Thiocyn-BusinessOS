import React from 'react';

// ─── Card ─────────────────────────────────────────────────────────────────────
// Glass card primitive. Use inside <Section>. Variants:
//   default — translucent 72%
//   strong  — translucent 85%
//   plain   — solid white (no glass effect, for use over images/textured backgrounds)

interface Props {
  children: React.ReactNode;
  variant?: 'default' | 'strong' | 'plain';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const PADDING: Record<NonNullable<Props['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
}: Props) {
  const base =
    variant === 'strong'
      ? 'glass-card-light-strong'
      : variant === 'plain'
        ? 'lt-card-plain'
        : 'glass-card-light';

  return (
    <div
      className={`${base} ${PADDING[padding]} ${onClick ? 'cursor-pointer transition-transform hover:-translate-y-0.5' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default Card;
