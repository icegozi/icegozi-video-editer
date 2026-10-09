import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: 'sm' | 'md';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  size = 'md',
  active = false,
  style,
  disabled,
  ...props
}) => {
  const dimension = size === 'sm' ? '28px' : '32px';

  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dimension,
        height: dimension,
        padding: 0,
        borderRadius: '4px',
        backgroundColor: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--accent)' : disabled ? 'var(--text-disabled)' : 'var(--text-secondary)',
        border: active ? '1px solid var(--accent)' : '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 80ms ease, color 80ms ease',
        ...style,
      }}
      {...props}
    >
      {icon}
    </button>
  );
};
