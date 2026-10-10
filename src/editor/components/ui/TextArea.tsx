import React from 'react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  hint,
  id,
  style,
  disabled,
  ...props
}) => {
  const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label
          htmlFor={textareaId}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-secondary, #52627A)',
          }}
        >
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        disabled={disabled}
        style={{
          minHeight: '72px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-control, 8px)',
          backgroundColor: disabled ? 'var(--color-surface-muted, #F2F5FA)' : 'var(--color-surface, #FFFFFF)',
          border: error
            ? '1px solid var(--color-danger, #DC2626)'
            : '1px solid var(--color-border-default, #CBD5E1)',
          color: disabled ? 'var(--color-text-disabled, #94A3B8)' : 'var(--color-text-primary, #17233B)',
          fontSize: '13px',
          lineHeight: '1.5',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          outline: 'none',
          width: '100%',
          resize: 'vertical',
          cursor: disabled ? 'not-allowed' : 'text',
          transition: 'border-color 120ms ease',
          ...style,
        }}
        aria-invalid={!!error}
        aria-describedby={error && textareaId ? `${textareaId}-error` : undefined}
        {...props}
      />

      {error && (
        <span
          id={textareaId ? `${textareaId}-error` : undefined}
          style={{ fontSize: '11px', color: 'var(--color-danger, #DC2626)', marginTop: '2px' }}
          role="alert"
        >
          {error}
        </span>
      )}

      {hint && !error && (
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', marginTop: '2px' }}>
          {hint}
        </span>
      )}
    </div>
  );
};
