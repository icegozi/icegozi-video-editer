/**
 * Calculates normalized linear progress from 0.0 to 1.0 within a frame window.
 */
export function getFrameProgress(currentFrame: number, startFrame: number, durationFrames: number): number {
  if (durationFrames <= 0) return 1;
  const progress = (currentFrame - startFrame) / durationFrames;
  return Math.max(0, Math.min(1, progress));
}
