import React from 'react';
import { AbsoluteFill } from 'remotion';

export interface SafeAreaProps {
  children?: React.ReactNode;
  marginPercent?: number; // Default 5%
  showGuide?: boolean; // For debugging/preview
  style?: React.CSSProperties;
}

/**
 * Ensures overlays, text, and subtitles stay within safe viewing boundaries.
 */
export const SafeArea: React.FC<SafeAreaProps> = ({
  children,
  marginPercent = 5,
  showGuide = false,
  style,
}) => {
  const margin = `${marginPercent}%`;

  return (
    <AbsoluteFill
      style={{
        position: 'absolute',
        top: margin,
        bottom: margin,
        left: margin,
        right: margin,
        boxSizing: 'border-box',
        border: showGuide ? '2px dashed rgba(255, 100, 100, 0.4)' : undefined,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
