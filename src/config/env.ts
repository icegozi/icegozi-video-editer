export interface AppEnv {
  defaultWidth: number;
  defaultHeight: number;
  defaultFps: number;
  ffmpegPath?: string;
  ffprobePath?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Reads environment settings with robust fallback defaults.
 */
export function getEnv(): AppEnv {
  return {
    defaultWidth: Number(process.env.VIDEO_DEFAULT_WIDTH) || 1920,
    defaultHeight: Number(process.env.VIDEO_DEFAULT_HEIGHT) || 1080,
    defaultFps: Number(process.env.VIDEO_DEFAULT_FPS) || 30,
    ffmpegPath: process.env.FFMPEG_PATH,
    ffprobePath: process.env.FFPROBE_PATH,
    logLevel: (process.env.LOG_LEVEL as AppEnv['logLevel']) || 'info',
  };
}
