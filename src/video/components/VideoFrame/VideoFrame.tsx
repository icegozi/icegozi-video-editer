import React from 'react';
import { AbsoluteFill } from 'remotion';

export interface VideoFrameProps {
  backgroundColor?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Fundamental layout primitive for video composition.
 * Enforces AbsoluteFill, bounds clipping, and uniform canvas background.
 */
export const VideoFrame: React.FC<VideoFrameProps> = ({
  backgroundColor = '#0A0A0C',
  children,
  style,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
