import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: string;
  sizeVariant?: 'sm' | 'md';
}

export const Select: React.FC<SelectProps> = ({
  options,
  label,
  error,
  sizeVariant = 'md',
  id,
  style,
  disabled,
  ...props
}) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const height = sizeVariant === 'sm' ? '32px' : '36px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-secondary, #52627A)',
          }}
        >
          {label}
        </label>
      )}

      <select
        id={selectId}
        disabled={disabled}
        style={{
          height,
          padding: '0 12px',
          borderRadius: 'var(--radius-control, 8px)',
          backgroundColor: disabled ? 'var(--color-surface-muted, #F2F5FA)' : 'var(--color-surface, #FFFFFF)',
          border: error
            ? '1px solid var(--color-danger, #DC2626)'
            : '1px solid var(--color-border-default, #CBD5E1)',
          color: disabled ? 'var(--color-text-disabled, #94A3B8)' : 'var(--color-text-primary, #17233B)',
          fontSize: '13px',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          width: '100%',
          transition: 'border-color 120ms ease',
          ...style,
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: '#FFFFFF', color: '#17233B' }}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <span style={{ fontSize: '11px', color: 'var(--color-danger, #DC2626)', marginTop: '2px' }} role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
