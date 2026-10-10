import path from 'node:path';

/**
 * Project root directory resolved cross-platform.
 */
const ROOT_DIR = path.resolve(process.env.ICEGOZI_APP_ROOT ?? process.cwd());
const DATA_DIR = path.resolve(process.env.ICEGOZI_DATA_DIR ?? ROOT_DIR);

/**
 * Standardized directory paths across the video processing pipeline.
 * Input assets are strictly separate from generated intermediates.
 */
export const PATHS = {
  root: ROOT_DIR,
  publicAssets: path.resolve(DATA_DIR, 'public', 'assets'),
  publicVideo: path.resolve(DATA_DIR, 'public', 'assets', 'video'),
  publicAudio: path.resolve(DATA_DIR, 'public', 'assets', 'audio'),
  publicImages: path.resolve(DATA_DIR, 'public', 'assets', 'images'),
  publicFonts: path.resolve(DATA_DIR, 'public', 'assets', 'fonts'),
  publicSubtitles: path.resolve(DATA_DIR, 'public', 'assets', 'subtitles'),

  // Generated intermediate assets (safe to delete)
  generated: path.resolve(DATA_DIR, 'generated'),
  normalized: path.resolve(DATA_DIR, 'generated', 'normalized'),
  frames: path.resolve(DATA_DIR, 'generated', 'frames'),
  previews: path.resolve(DATA_DIR, 'generated', 'previews'),
  temp: path.resolve(DATA_DIR, 'generated', 'temp'),

  // Production render outputs
  output: path.resolve(DATA_DIR, 'output'),

  // Project definitions
  projects: path.resolve(ROOT_DIR, 'projects'),
} as const;

export type PathConfig = typeof PATHS;
