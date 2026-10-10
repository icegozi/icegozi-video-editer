import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: React.CSSProperties;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã xảy ra lỗi',
  message,
  onRetry,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--color-danger-subtle, #FEF2F2)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
        borderRadius: 'var(--radius-card, 12px)',
        textAlign: 'center',
        ...style,
      }}
      role="alert"
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          color: 'var(--color-danger, #DC2626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.1)',
        }}
      >
        <AlertCircle size={20} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-danger, #DC2626)', marginBottom: '4px' }}>
        {title}
      </span>
      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #52627A)', maxWidth: '320px', lineHeight: '1.4', marginBottom: onRetry ? '12px' : '0' }}>
        {message}
      </span>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RotateCcw size={12} />} onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
};
