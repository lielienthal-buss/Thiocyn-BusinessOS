import React from 'react';

// ─── Pill (Badge) ─────────────────────────────────────────────────────────────
// Unified badge with semantic variants. Includes Mahnstufen + status pills.

type Variant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'alert'
  | 'gold'
  | 'blue'
  | 'stufe-1'
  | 'stufe-2'
  | 'stufe-3'
  | 'stufe-4';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  pulse?: boolean;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}

const VARIANT_CLASS: Record<Variant, string> = {
  neutral: 'lt-badge-neutral',
  success: 'lt-badge-success',
  warning: 'lt-badge-warning',
  danger: 'lt-badge-danger',
  alert: 'lt-badge-alert',
  gold: 'lt-badge-gold',
  blue: 'lt-badge-blue',
  'stufe-1': 'lt-badge-stufe-1',
  'stufe-2': 'lt-badge-stufe-2',
  'stufe-3': 'lt-badge-stufe-3',
  'stufe-4': 'lt-badge-stufe-4',
};

export function Pill({
  children,
  variant = 'neutral',
  pulse = false,
  icon,
  className = '',
  title,
}: Props) {
  return (
    <span
      className={`lt-badge ${VARIANT_CLASS[variant]} ${pulse ? 'lt-pulse' : ''} ${className}`}
      title={title}
    >
      {icon && <span className="lt-badge-icon">{icon}</span>}
      {children}
    </span>
  );
}

export default Pill;
