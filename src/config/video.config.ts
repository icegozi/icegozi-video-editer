/**
 * Centralized default video configuration.
 * All values can be overridden per project.
 */
export const VIDEO_CONFIG = {
  DEFAULT_WIDTH: 1920,
  DEFAULT_HEIGHT: 1080,
  DEFAULT_FPS: 30,
  DEFAULT_ASPECT_RATIO: '16:9',
  DEFAULT_PIXEL_FORMAT: 'yuv420p',
  DEFAULT_VIDEO_CODEC: 'h264',
  DEFAULT_AUDIO_CODEC: 'aac',
  DEFAULT_AUDIO_SAMPLE_RATE: 48000,
  DEFAULT_AUDIO_BITRATE: '320k',
} as const;

export type VideoConfigDefaults = typeof VIDEO_CONFIG;
