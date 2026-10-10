import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'export';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  children,
  style,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getVariantStyles = (): React.CSSProperties => {
    if (isDisabled) {
      return {
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        color: 'var(--color-text-disabled, #94A3B8)',
        border: '1px solid var(--color-border-subtle, #E2E8F0)',
        cursor: 'not-allowed',
        boxShadow: 'none',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary, #3568E8)',
          color: '#FFFFFF',
          border: '1px solid transparent',
          fontWeight: 600,
          boxShadow: '0 1px 2px rgba(53, 104, 232, 0.2)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-danger, #DC2626)',
          color: '#FFFFFF',
          border: '1px solid transparent',
          fontWeight: 600,
          boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary, #17233B)',
          border: '1px solid transparent',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-primary, #3568E8)',
          border: '1px solid var(--color-primary, #3568E8)',
          fontWeight: 500,
        };
      case 'secondary':
      default:
        return {
          backgroundColor: 'var(--color-surface, #FFFFFF)',
          color: 'var(--color-text-primary, #17233B)',
          border: '1px solid var(--color-border-default, #CBD5E1)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        };
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return '32px';
      case 'lg':
      case 'export':
        return '40px';
      case 'md':
      default:
        return '36px';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return '0 10px';
      case 'lg':
      case 'export':
        return '0 18px';
      case 'md':
      default:
        return '0 14px';
    }
  };

  const getFontSize = () => {
    return size === 'sm' ? '12px' : '13px';
  };

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: getHeight(),
        padding: getPadding(),
        borderRadius: 'var(--radius-control, 8px)',
        fontSize: getFontSize(),
        fontFamily: 'inherit',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 120ms ease',
        whiteSpace: 'nowrap',
        outline: 'none',
        ...getVariantStyles(),
        ...style,
      }}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="spin-animation" aria-hidden="true" />
      ) : (
        icon && <span style={{ display: 'inline-flex', fontSize: '14px' }}>{icon}</span>
      )}
      {children}
    </button>
  );
};
