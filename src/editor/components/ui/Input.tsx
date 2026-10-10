import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  tabular?: boolean;
  sizeVariant?: 'sm' | 'md';
  error?: string;
  label?: string;
  iconPrefix?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  tabular = false,
  sizeVariant = 'md',
  error,
  label,
  iconPrefix,
  style,
  disabled,
  id,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const height = sizeVariant === 'sm' ? '32px' : '36px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-secondary, #52627A)',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {iconPrefix && (
          <span
            style={{
              position: 'absolute',
              left: '10px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--color-text-muted, #64748B)',
              pointerEvents: 'none',
            }}
          >
            {iconPrefix}
          </span>
        )}

        <input
          id={inputId}
          disabled={disabled}
          style={{
            height,
            padding: iconPrefix ? '0 12px 0 34px' : '0 12px',
            borderRadius: 'var(--radius-control, 8px)',
            backgroundColor: disabled ? 'var(--color-surface-muted, #F2F5FA)' : 'var(--color-surface, #FFFFFF)',
            border: error
              ? '1px solid var(--color-danger, #DC2626)'
              : '1px solid var(--color-border-default, #CBD5E1)',
            color: disabled ? 'var(--color-text-disabled, #94A3B8)' : 'var(--color-text-primary, #17233B)',
            fontSize: '13px',
            fontFamily: tabular ? '"JetBrains Mono", monospace' : 'inherit',
            boxSizing: 'border-box',
            outline: 'none',
            fontVariantNumeric: tabular ? 'tabular-nums' : undefined,
            width: '100%',
            cursor: disabled ? 'not-allowed' : 'text',
            transition: 'border-color 120ms ease, box-shadow 120ms ease',
            ...style,
          }}
          aria-invalid={!!error}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
      </div>

      {error && (
        <span
          id={inputId ? `${inputId}-error` : undefined}
          style={{
            fontSize: '11px',
            color: 'var(--color-danger, #DC2626)',
            marginTop: '2px',
          }}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
};
