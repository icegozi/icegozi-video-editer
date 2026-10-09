import path from 'node:path';

/**
 * Project root directory resolved cross-platform.
 */
const ROOT_DIR = process.cwd();

/**
 * Standardized directory paths across the video processing pipeline.
 * Input assets are strictly separate from generated intermediates.
 */
export const PATHS = {
  root: ROOT_DIR,
  publicAssets: path.resolve(ROOT_DIR, 'public', 'assets'),
  publicVideo: path.resolve(ROOT_DIR, 'public', 'assets', 'video'),
  publicAudio: path.resolve(ROOT_DIR, 'public', 'assets', 'audio'),
  publicImages: path.resolve(ROOT_DIR, 'public', 'assets', 'images'),
  publicFonts: path.resolve(ROOT_DIR, 'public', 'assets', 'fonts'),
  publicSubtitles: path.resolve(ROOT_DIR, 'public', 'assets', 'subtitles'),

  // Generated intermediate assets (safe to delete)
  generated: path.resolve(ROOT_DIR, 'generated'),
  normalized: path.resolve(ROOT_DIR, 'generated', 'normalized'),
  frames: path.resolve(ROOT_DIR, 'generated', 'frames'),
  previews: path.resolve(ROOT_DIR, 'generated', 'previews'),
  temp: path.resolve(ROOT_DIR, 'generated', 'temp'),

  // Production render outputs
  output: path.resolve(ROOT_DIR, 'output'),

  // Project definitions
  projects: path.resolve(ROOT_DIR, 'projects'),
} as const;

export type PathConfig = typeof PATHS;
