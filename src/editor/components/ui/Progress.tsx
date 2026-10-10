import React from 'react';

export interface ProgressProps {
  value?: number; // 0 to 100, undefined for indeterminate
  label?: string;
  showPercent?: boolean;
  style?: React.CSSProperties;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  label,
  showPercent = false,
  style,
}) => {
  const isIndeterminate = typeof value !== 'number';
  const clamped = isIndeterminate ? 0 : Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', ...style }}>
      {(label || showPercent) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && (
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary, #52627A)' }}>
              {label}
            </span>
          )}
          {showPercent && !isIndeterminate && (
            <span
              className="tabular-nums"
              style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-primary, #17233B)' }}
            >
              {clamped}%
            </span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: '6px',
          width: '100%',
          backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {isIndeterminate ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '40%',
              backgroundColor: 'var(--color-primary, #3568E8)',
              borderRadius: '9999px',
              animation: 'spin 1.5s ease-in-out infinite alternate',
            }}
          />
        ) : (
          <div
            style={{
              height: '100%',
              width: `${clamped}%`,
              backgroundColor: 'var(--color-primary, #3568E8)',
              borderRadius: '9999px',
              transition: 'width 200ms ease',
            }}
          />
        )}
      </div>
    </div>
  );
};
