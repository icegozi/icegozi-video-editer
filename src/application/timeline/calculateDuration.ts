/**
 * Converts seconds to frames based on video FPS.
 */
export function secondsToFrames(seconds: number, fps: number): number {
  if (seconds < 0) throw new Error('Seconds must be non-negative');
  if (fps <= 0) throw new Error('FPS must be greater than zero');
  return Math.round(seconds * fps);
}

/**
 * Converts frames to seconds based on video FPS.
 */
export function framesToSeconds(frames: number, fps: number): number {
  if (frames < 0) throw new Error('Frames must be non-negative');
  if (fps <= 0) throw new Error('FPS must be greater than zero');
  return frames / fps;
}
