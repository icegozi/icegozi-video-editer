import { interpolate, InterpolateOptions } from 'remotion';

/**
 * Clamped interpolation helper ensuring values never leak outside the output range.
 */
export function interpolateClamped(
  frame: number,
  inputRange: [number, number],
  outputRange: [number, number],
  options?: Omit<InterpolateOptions, 'extrapolateLeft' | 'extrapolateRight'>
): number {
  return interpolate(frame, inputRange, outputRange, {
    ...options,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}
