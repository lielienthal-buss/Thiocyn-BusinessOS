import React from 'react';

// ─── Section ──────────────────────────────────────────────────────────────────
// Wraps content in `.light-section` scope. All other light-* primitives only
// work inside this wrapper because the CSS variables and helpers are scoped
// to `.light-section *` selectors in index.css.

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function Section({ children, className = '' }: Props) {
  return <div className={`light-section ${className}`}>{children}</div>;
}

export default Section;
