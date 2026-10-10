import React from 'react';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  style?: React.CSSProperties;
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  style,
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      style={{
        backgroundColor: 'var(--color-border-subtle, #E2E8F0)',
        ...(isHorizontal
          ? { height: '1px', width: '100%', margin: '8px 0' }
          : { width: '1px', height: '100%', margin: '0 8px' }),
        ...style,
      }}
    />
  );
};
