import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  tabular?: boolean;
}

export const Input: React.FC<InputProps> = ({ tabular = false, style, ...props }) => {
  return (
    <input
      style={{
        height: '32px',
        padding: '0 10px',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-primary)',
        fontSize: '12px',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        outline: 'none',
        fontVariantNumeric: tabular ? 'tabular-nums' : undefined,
        width: '100%',
        transition: 'border-color 100ms ease',
        ...style,
      }}
      {...props}
    />
  );
};
