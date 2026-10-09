import { inspectMedia } from '../src/application/media/inspectMedia';
import { logger } from '../src/infrastructure/logging/logger';

async function main() {
  const targetPath = process.argv[2];

  if (!targetPath) {
    logger.error('Usage: tsx scripts/inspect-media.ts <path-to-media-file>');
    process.exit(1);
  }

  try {
    logger.info(`Inspecting media metadata for: ${targetPath}`);
    const metadata = await inspectMedia(targetPath);
    console.log('\n--- MEDIA METADATA ---');
    console.log(JSON.stringify(metadata, null, 2));
    console.log('----------------------\n');
  } catch (error) {
    logger.error('Failed to inspect media', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

main();
