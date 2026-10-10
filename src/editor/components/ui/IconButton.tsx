import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary' | 'primary' | 'danger';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  active = false,
  style,
  disabled,
  ...props
}) => {
  const getDimension = () => {
    switch (size) {
      case 'sm':
        return '30px';
      case 'lg':
        return '40px';
      case 'md':
      default:
        return '34px';
    }
  };

  const getVariantStyles = (): React.CSSProperties => {
    if (disabled) {
      return {
        backgroundColor: 'transparent',
        color: 'var(--color-text-disabled, #94A3B8)',
        borderColor: 'transparent',
        cursor: 'not-allowed',
      };
    }

    if (active) {
      return {
        backgroundColor: 'var(--color-primary-subtle, #EEF3FF)',
        color: 'var(--color-primary, #3568E8)',
        borderColor: 'var(--color-primary, #3568E8)',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary, #3568E8)',
          color: '#FFFFFF',
          borderColor: 'transparent',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-surface, #FFFFFF)',
          color: 'var(--color-text-primary, #17233B)',
          borderColor: 'var(--color-border-default, #CBD5E1)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-danger-subtle, #FEF2F2)',
          color: 'var(--color-danger, #DC2626)',
          borderColor: 'transparent',
        };
      case 'ghost':
      default:
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary, #52627A)',
          borderColor: 'transparent',
        };
    }
  };

  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: getDimension(),
        height: getDimension(),
        padding: 0,
        borderRadius: 'var(--radius-control, 8px)',
        border: '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 120ms ease',
        flexShrink: 0,
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {icon}
    </button>
  );
};
