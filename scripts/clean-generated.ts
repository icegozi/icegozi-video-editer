import { FileSystem } from '../src/infrastructure/filesystem/FileSystem';
import { PATHS } from '../src/config/paths.config';
import { logger } from '../src/infrastructure/logging/logger';
import { ensureDirectories } from '../src/infrastructure/filesystem/ensureDirectories';

function main() {
  logger.info('Cleaning generated intermediate files...');

  const targets = [PATHS.normalized, PATHS.frames, PATHS.previews, PATHS.temp];
  let totalCleaned = 0;

  for (const dir of targets) {
    totalCleaned += FileSystem.cleanDirectory(dir);
  }

  ensureDirectories();
  logger.info(`Cleanup complete. Total ${totalCleaned} generated files removed.`);
}

main();
