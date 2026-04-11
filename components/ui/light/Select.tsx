import React from 'react';

// ─── Select ───────────────────────────────────────────────────────────────────

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  width?: 'auto' | 'full';
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder,
  disabled,
  className = '',
  id,
  width = 'full',
}: Props) {
  const selectId = id ?? `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className={className} style={width === 'auto' ? { display: 'inline-block' } : undefined}>
      {label && (
        <label htmlFor={selectId} className="lt-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="lt-select"
        style={width === 'auto' ? { width: 'auto', minWidth: '150px' } : undefined}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Select;
