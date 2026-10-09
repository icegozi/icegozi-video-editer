import React from 'react';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  showValue?: boolean;
  unit?: string;
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
  style,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', ...style }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          flex: 1,
          height: '4px',
          accentColor: 'var(--accent)',
          cursor: 'pointer',
        }}
      />
      {showValue && (
        <span
          className="tabular-nums"
          style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '36px', textAlign: 'right' }}
        >
          {value}
          {unit}
        </span>
      )}
    </div>
  );
};
