import React from 'react';

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps {
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'number' | 'date' | 'password' | 'tel';
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  step?: string;
  min?: string | number;
  max?: string | number;
  className?: string;
  id?: string;
}

export function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  label,
  required,
  disabled,
  step,
  min,
  max,
  className = '',
  id,
}: InputProps) {
  const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="lt-label">
          {label}
          {required && <span className="lt-text-danger ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        className="lt-input"
      />
    </div>
  );
}

export default Input;
