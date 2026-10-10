import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-control, 8px)',
  style,
}) => {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
        backgroundImage: 'linear-gradient(90deg, #F2F5FA 0%, #E3E8F1 50%, #F2F5FA 100%)',
        backgroundSize: '200% 100%',
        animation: 'spin 1.5s infinite linear',
        ...style,
      }}
    />
  );
};
