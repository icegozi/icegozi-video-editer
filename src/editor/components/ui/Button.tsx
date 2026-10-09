import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'export';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  style,
  disabled,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    if (disabled) {
      return {
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-disabled)',
        border: '1px solid var(--border-subtle)',
        cursor: 'not-allowed',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--accent)',
          color: '#FFFFFF',
          border: '1px solid transparent',
          fontWeight: 600,
        };
      case 'danger':
        return {
          backgroundColor: 'var(--danger)',
          color: '#FFFFFF',
          border: '1px solid transparent',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid transparent',
        };
      case 'secondary':
      default:
        return {
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        };
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return '28px';
      case 'export':
        return '36px';
      case 'md':
      default:
        return '32px';
    }
  };

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: getHeight(),
        padding: size === 'sm' ? '0 10px' : size === 'export' ? '0 18px' : '0 14px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 100ms ease, border-color 100ms ease',
        whiteSpace: 'nowrap',
        ...getVariantStyles(),
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', fontSize: '14px' }}>{icon}</span>}
      {children}
    </button>
  );
};
