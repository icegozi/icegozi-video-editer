import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export interface FadeProps {
  durationInFrames: number;
  type?: 'in' | 'out' | 'both';
  totalDurationInFrames?: number;
  children: React.ReactNode;
}

/**
 * Deterministic frame-based fade transition.
 */
export const Fade: React.FC<FadeProps> = ({
  durationInFrames,
  type = 'in',
  totalDurationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();

  let opacity = 1;

  if (type === 'in' || type === 'both') {
    const fadeInOpacity = interpolate(frame, [0, durationInFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    opacity = Math.min(opacity, fadeInOpacity);
  }

  if ((type === 'out' || type === 'both') && totalDurationInFrames) {
    const fadeOutOpacity = interpolate(
      frame,
      [totalDurationInFrames - durationInFrames, totalDurationInFrames],
      [1, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
    opacity = Math.min(opacity, fadeOutOpacity);
  }

  return <div style={{ width: '100%', height: '100%', opacity }}>{children}</div>;
};
