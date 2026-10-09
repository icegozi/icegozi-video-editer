import { useCurrentFrame } from 'remotion';
import { getFrameProgress } from '../animation/timing';

/**
 * Hook providing normalized 0..1 scene progress for the active scene duration.
 */
export function useTimelineProgress(durationInFrames: number): number {
  const frame = useCurrentFrame();
  return getFrameProgress(frame, 0, durationInFrames);
}
