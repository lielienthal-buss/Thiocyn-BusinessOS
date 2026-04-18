import React from 'react';

// ─── ShinyText ──────────────────────────────────────────────────────────────
// Animated light-glare effect that pans across text.
// Inspired by React Bits. Zero dependencies, pure CSS animation.
//
// Usage:
//   <ShinyText>€ 42.806</ShinyText>
//   <ShinyText color="amber" speed="fast">+12.4%</ShinyText>

interface Props {
  children: React.ReactNode;
  color?: 'amber' | 'indigo' | 'white' | 'success';
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
  as?: React.ElementType;
}

const COLOR_GRADIENT: Record<NonNullable<Props['color']>, string> = {
  amber:
    'linear-gradient(120deg, #d97706 0%, #fbbf24 25%, #fef3c7 50%, #fbbf24 75%, #d97706 100%)',
  indigo:
    'linear-gradient(120deg, #4f46e5 0%, #818cf8 25%, #e0e7ff 50%, #818cf8 75%, #4f46e5 100%)',
  white:
    'linear-gradient(120deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.9) 25%, #fff 50%, rgba(255,255,255,0.9) 75%, rgba(255,255,255,0.6) 100%)',
  success:
    'linear-gradient(120deg, #059669 0%, #34d399 25%, #d1fae5 50%, #34d399 75%, #059669 100%)',
};

const SPEED_DURATION: Record<NonNullable<Props['speed']>, string> = {
  slow: '4s',
  normal: '2.5s',
  fast: '1.5s',
};

export function ShinyText({
  children,
  color = 'amber',
  speed = 'normal',
  className = '',
  as: Tag = 'span',
}: Props) {
  return (
    <Tag
      className={`shiny-text ${className}`}
      style={{
        background: COLOR_GRADIENT[color],
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: `shinyTextSlide ${SPEED_DURATION[speed]} linear infinite`,
      }}
    >
      {children}
    </Tag>
  );
}

export default ShinyText;
