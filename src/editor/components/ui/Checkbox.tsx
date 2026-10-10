import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
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
        role="checkbox"
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
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: checked
            ? '1px solid var(--color-primary, #3568E8)'
            : '1px solid var(--color-border-default, #CBD5E1)',
          backgroundColor: checked
            ? 'var(--color-primary, #3568E8)'
            : disabled
            ? 'var(--color-surface-muted, #F2F5FA)'
            : 'var(--color-surface, #FFFFFF)',
          color: '#FFFFFF',
          transition: 'all 120ms ease',
          outline: 'none',
        }}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </div>
      {label && <span>{label}</span>}
    </label>
  );
};
