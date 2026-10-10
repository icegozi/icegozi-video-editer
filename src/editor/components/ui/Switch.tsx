import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  id,
}) => {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        fontSize: '13px',
        color: disabled ? 'var(--color-text-disabled, #94A3B8)' : 'var(--color-text-primary, #17233B)',
      }}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        id={id}
        onKeyDown={(e) => {
          if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        style={{
          width: '32px',
          height: '18px',
          borderRadius: '9999px',
          backgroundColor: checked
            ? 'var(--color-primary, #3568E8)'
            : 'var(--color-border-strong, #94A3B8)',
          position: 'relative',
          transition: 'background-color 120ms ease',
          outline: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '16px' : '2px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            transition: 'left 120ms ease',
          }}
        />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
};
