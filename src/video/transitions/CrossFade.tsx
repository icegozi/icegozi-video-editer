import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export interface CrossFadeProps {
  inDurationInFrames?: number;
  outDurationInFrames?: number;
  totalDurationInFrames: number;
  children: React.ReactNode;
}

/**
 * Crossfade component supporting continuity-first editing.
 * Fades in during incoming transition and fades out during outgoing transition.
 */
export const CrossFade: React.FC<CrossFadeProps> = ({
  inDurationInFrames = 0,
  outDurationInFrames = 0,
  totalDurationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();

  const fadeIn = inDurationInFrames > 0
    ? interpolate(frame, [0, inDurationInFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const fadeOut = outDurationInFrames > 0
    ? interpolate(
        frame,
        [totalDurationInFrames - outDurationInFrames, totalDurationInFrames],
        [1, 0],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      )
    : 1;

  const opacity = Math.min(fadeIn, fadeOut);

  return <div style={{ width: '100%', height: '100%', opacity }}>{children}</div>;
};
