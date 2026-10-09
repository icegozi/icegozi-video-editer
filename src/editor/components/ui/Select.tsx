import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string | number; label: string }>;
}

export const Select: React.FC<SelectProps> = ({ options, style, ...props }) => {
  return (
    <select
      style={{
        height: '32px',
        padding: '0 8px',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-primary)',
        fontSize: '12px',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        outline: 'none',
        cursor: 'pointer',
        width: '100%',
        ...style,
      }}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--bg-panel)' }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
