import React from 'react';

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  onChange: (val: number) => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  min,
  max,
  step = 1,
  unit,
  label,
  onChange,
  style,
  disabled,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      let clamped = parsed;
      if (typeof min === 'number') clamped = Math.max(min, clamped);
      if (typeof max === 'number') clamped = Math.min(max, clamped);
      onChange(clamped);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary, #52627A)' }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
          disabled={disabled}
          style={{
            height: '36px',
            padding: unit ? '0 32px 0 12px' : '0 12px',
            borderRadius: 'var(--radius-control, 8px)',
            backgroundColor: disabled ? 'var(--color-surface-muted, #F2F5FA)' : 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border-default, #CBD5E1)',
            color: disabled ? 'var(--color-text-disabled, #94A3B8)' : 'var(--color-text-primary, #17233B)',
            fontSize: '13px',
            fontFamily: '"JetBrains Mono", monospace',
            fontVariantNumeric: 'tabular-nums',
            boxSizing: 'border-box',
            outline: 'none',
            width: '100%',
            cursor: disabled ? 'not-allowed' : 'text',
            transition: 'border-color 120ms ease',
            ...style,
          }}
          {...props}
        />
        {unit && (
          <span
            style={{
              position: 'absolute',
              right: '10px',
              fontSize: '11px',
              color: 'var(--color-text-muted, #64748B)',
              pointerEvents: 'none',
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};
