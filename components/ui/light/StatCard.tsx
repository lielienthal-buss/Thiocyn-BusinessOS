import React from 'react';

// ─── StatCard ─────────────────────────────────────────────────────────────────
// Single KPI/stat card. Use in Bento grids or inline rows.

type Variant = 'default' | 'success' | 'warning' | 'danger';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  variant?: Variant;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VARIANT_VALUE_CLASS: Record<Variant, string> = {
  default: '',
  success: 'lt-stat-card-value-success',
  warning: 'lt-stat-card-value-warning',
  danger: 'lt-stat-card-value-danger',
};

export function StatCard({
  label,
  value,
  sub,
  variant = 'default',
  icon,
  size = 'md',
  className = '',
}: Props) {
  return (
    <div className={`lt-stat-card lt-stat-card-${size} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="lt-stat-card-label">{label}</span>
        {icon && <span className="lt-stat-card-icon">{icon}</span>}
      </div>
      <span className={`lt-stat-card-value ${VARIANT_VALUE_CLASS[variant]}`}>{value}</span>
      {sub && <span className="lt-stat-card-sub">{sub}</span>}
    </div>
  );
}

export default StatCard;
