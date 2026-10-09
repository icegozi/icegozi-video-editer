import fs from 'node:fs';
import { PATHS } from '../../config/paths.config';
import { logger } from '../logging/logger';

/**
 * Ensures all required pipeline directories exist on the filesystem.
 */
export function ensureDirectories(): void {
  const dirsToEnsure = [
    PATHS.publicAssets,
    PATHS.publicVideo,
    PATHS.publicAudio,
    PATHS.publicImages,
    PATHS.publicFonts,
    PATHS.publicSubtitles,
    PATHS.generated,
    PATHS.normalized,
    PATHS.frames,
    PATHS.previews,
    PATHS.temp,
    PATHS.output,
    PATHS.projects,
  ];

  for (const dir of dirsToEnsure) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.debug(`Created directory: ${dir}`);
    }
  }
}
