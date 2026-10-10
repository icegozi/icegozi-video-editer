import React from 'react';

export interface TimelineTrackProps {
  totalWidthPx: number;
  height?: number;
  children?: React.ReactNode;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  totalWidthPx,
  height = 52,
  children,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: `${totalWidthPx}px`,
        height: `${height}px`,
        backgroundColor: 'var(--color-app-bg, #F7F9FC)',
        borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Background Grid Lines / Lane styling */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, var(--color-border-subtle, #E2E8F0) 1px, transparent 1px)',
          backgroundSize: '100px 100%',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
};
