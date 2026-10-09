/**
 * Pure timeline geometry functions.
 * All spatial timeline representations strictly derive from frames, FPS, and pixelsPerSecond.
 */

export function framesToPixels(frames: number, fps: number, pixelsPerSecond: number): number {
  return (frames / fps) * pixelsPerSecond;
}

export function pixelsToFrames(pixels: number, fps: number, pixelsPerSecond: number): number {
  if (pixelsPerSecond <= 0) return 0;
  return Math.round((pixels / pixelsPerSecond) * fps);
}

export function timeToPixels(seconds: number, pixelsPerSecond: number): number {
  return seconds * pixelsPerSecond;
}

export function pixelsToTime(pixels: number, pixelsPerSecond: number): number {
  if (pixelsPerSecond <= 0) return 0;
  return pixels / pixelsPerSecond;
}

/**
 * Calculates snap point if target is within threshold pixels of any candidate.
 */
export function findSnapFrame(
  targetFrame: number,
  candidateFrames: number[],
  fps: number,
  pixelsPerSecond: number,
  thresholdPixels = 6
): { snappedFrame: number; isSnapped: boolean } {
  let closestDist = Infinity;
  let snappedFrame = targetFrame;
  let isSnapped = false;

  for (const candidate of candidateFrames) {
    const distPx = Math.abs(framesToPixels(candidate - targetFrame, fps, pixelsPerSecond));
    if (distPx <= thresholdPixels && distPx < closestDist) {
      closestDist = distPx;
      snappedFrame = candidate;
      isSnapped = true;
    }
  }

  return { snappedFrame, isSnapped };
}
