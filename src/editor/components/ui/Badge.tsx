import React from 'react';

export interface BadgeProps {
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  icon,
  onClick,
  style,
}) => {
  const getStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'brand':
        return {
          backgroundColor: 'var(--color-primary-subtle, #EEF3FF)',
          color: 'var(--color-primary, #3568E8)',
          border: '1px solid rgba(53, 104, 232, 0.2)',
        };
      case 'success':
        return {
          backgroundColor: 'var(--color-success-subtle, #ECFDF5)',
          color: 'var(--color-success, #167A4A)',
          border: '1px solid rgba(22, 122, 74, 0.2)',
        };
      case 'warning':
        return {
          backgroundColor: 'var(--color-warning-subtle, #FFFBEB)',
          color: 'var(--color-warning, #B45309)',
          border: '1px solid rgba(180, 83, 9, 0.2)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-danger-subtle, #FEF2F2)',
          color: 'var(--color-danger, #DC2626)',
          border: '1px solid rgba(220, 38, 38, 0.2)',
        };
      case 'info':
        return {
          backgroundColor: 'var(--color-info-subtle, #EEF3FF)',
          color: 'var(--color-info, #3568E8)',
          border: '1px solid rgba(53, 104, 232, 0.2)',
        };
      case 'default':
      default:
        return {
          backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
          color: 'var(--color-text-secondary, #52627A)',
          border: '1px solid var(--color-border-subtle, #E2E8F0)',
        };
    }
  };

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 500,
        lineHeight: '16px',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...getStyles(),
        ...style,
      }}
    >
      {icon && <span style={{ display: 'inline-flex', fontSize: '11px' }}>{icon}</span>}
      {children}
    </span>
  );
};
