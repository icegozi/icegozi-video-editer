import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
            color: 'var(--color-primary, #3568E8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          {icon}
        </div>
      )}
      <span
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-primary, #17233B)',
          marginBottom: description ? '4px' : '0',
        }}
      >
        {title}
      </span>
      {description && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary, #52627A)',
            maxWidth: '300px',
            lineHeight: '1.4',
            marginBottom: action ? '16px' : '0',
          }}
        >
          {description}
        </span>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
