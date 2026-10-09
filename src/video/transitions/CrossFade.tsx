import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export interface CrossFadeProps {
  durationInFrames: number;
  totalDurationInFrames: number;
  children: React.ReactNode;
}

/**
 * Crossfade component supporting continuity-first editing.
 * Fades in at the beginning and out at the end of a scene duration.
 */
export const CrossFade: React.FC<CrossFadeProps> = ({
  durationInFrames,
  totalDurationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeOut = interpolate(
    frame,
    [totalDurationInFrames - durationInFrames, totalDurationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return <div style={{ width: '100%', height: '100%', opacity }}>{children}</div>;
};
