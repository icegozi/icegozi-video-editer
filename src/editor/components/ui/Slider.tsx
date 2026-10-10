import React from 'react';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  showValue?: boolean;
  unit?: string;
  label?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  showValue = false,
  unit = '',
  label,
  disabled = false,
  style,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', ...style }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary, #52627A)' }}>
            {label}
          </span>
          {showValue && (
            <span
              className="tabular-nums"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--color-text-primary, #17233B)',
              }}
            >
              {value}
              {unit}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : min}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            flex: 1,
            height: '4px',
            accentColor: 'var(--color-primary, #3568E8)',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          aria-label={label || 'Slider'}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
        {!label && showValue && (
          <span
            className="tabular-nums"
            style={{
              fontSize: '11px',
              color: 'var(--color-text-secondary, #52627A)',
              minWidth: '36px',
              textAlign: 'right',
            }}
          >
            {value}
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};
