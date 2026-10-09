import { Easing } from 'remotion';

/**
 * Standard deterministic easing curves for video motion design.
 */
export const EASING = {
  easeInOutCubic: Easing.bezier(0.65, 0, 0.35, 1),
  easeOutExpo: Easing.bezier(0.16, 1, 0.3, 1),
  easeOutBack: Easing.bezier(0.34, 1.56, 0.64, 1),
  easeInOutQuad: Easing.bezier(0.45, 0, 0.55, 1),
  linear: Easing.linear,
} as const;
