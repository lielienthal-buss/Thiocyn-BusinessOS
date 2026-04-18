import React from 'react';

// ─── GradientOrbs ───────────────────────────────────────────────────────────
// Animated ambient background orbs. Replaces static .ambient-bg pseudo-elements
// with smoothly floating gradient blobs.
//
// Usage: Place as first child inside a relative container.
//   <div className="relative">
//     <GradientOrbs />
//     {/* content */}
//   </div>

interface Props {
  className?: string;
  intensity?: 'subtle' | 'medium' | 'vivid';
}

const OPACITY: Record<NonNullable<Props['intensity']>, { primary: number; secondary: number; tertiary: number }> = {
  subtle:  { primary: 0.04, secondary: 0.03, tertiary: 0.02 },
  medium:  { primary: 0.07, secondary: 0.05, tertiary: 0.04 },
  vivid:   { primary: 0.12, secondary: 0.08, tertiary: 0.06 },
};

export function GradientOrbs({ className = '', intensity = 'medium' }: Props) {
  const o = OPACITY[intensity];

  return (
    <div className={`gradient-orbs-container ${className}`} aria-hidden="true">
      {/* Indigo orb — top right, slow drift */}
      <div
        className="gradient-orb animate-mesh-1"
        style={{
          top: '-20%',
          right: '-10%',
          width: '60vw',
          height: '60vw',
          background: `radial-gradient(circle, rgba(99, 102, 241, ${o.primary}) 0%, transparent 65%)`,
        }}
      />
      {/* Amber orb — bottom left, medium drift */}
      <div
        className="gradient-orb animate-mesh-2"
        style={{
          bottom: '-15%',
          left: '-8%',
          width: '50vw',
          height: '50vw',
          background: `radial-gradient(circle, rgba(245, 158, 11, ${o.secondary}) 0%, transparent 65%)`,
        }}
      />
      {/* Accent orb — center, subtle pulse */}
      <div
        className="gradient-orb animate-mesh-3"
        style={{
          top: '40%',
          left: '30%',
          width: '35vw',
          height: '35vw',
          background: `radial-gradient(circle, rgba(139, 92, 246, ${o.tertiary}) 0%, transparent 60%)`,
        }}
      />
    </div>
  );
}

export default GradientOrbs;
