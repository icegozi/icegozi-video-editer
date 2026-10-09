import { normalizeMedia } from '../src/application/media/normalizeMedia';
import { logger } from '../src/infrastructure/logging/logger';

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    logger.error('Usage: tsx scripts/normalize-media.ts <path-to-input-video>');
    process.exit(1);
  }

  try {
    const result = await normalizeMedia(inputPath);
    logger.info('Media normalization successful!', result);
  } catch (error) {
    logger.error('Media normalization failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
