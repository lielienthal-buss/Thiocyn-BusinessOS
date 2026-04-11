import React from 'react';

// ─── Button ───────────────────────────────────────────────────────────────────
// Variants:
//   primary  — Thiocyn Gold, main CTA
//   success  — Emerald, "mark done"
//   danger   — Solid red, urgent actions (Sofort zahlen)
//   ghost    — Transparent, secondary
//   neutral  — Subtle grey, tertiary
// Sizes:
//   sm  — 11px
//   md  — 13px (default)
//   lg  — 14px

type Variant = 'primary' | 'success' | 'danger' | 'ghost' | 'neutral';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconRight?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'lt-btn-primary',
  success: 'lt-btn-success',
  danger: 'lt-btn-danger',
  ghost: 'lt-btn-ghost',
  neutral: 'lt-btn-neutral',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'lt-btn-size-sm',
  md: 'lt-btn-size-md',
  lg: 'lt-btn-size-lg',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight = false,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  fullWidth = false,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${disabled ? 'lt-btn-disabled' : ''} ${fullWidth ? 'w-full justify-center' : ''} ${className}`}
    >
      {icon && !iconRight && <span className="lt-btn-icon">{icon}</span>}
      <span>{children}</span>
      {icon && iconRight && <span className="lt-btn-icon">{icon}</span>}
    </button>
  );
}

export default Button;
