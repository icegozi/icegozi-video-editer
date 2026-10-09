import path from 'node:path';
import { FfmpegClient } from '../src/infrastructure/ffmpeg/FfmpegClient';
import { buildExtractFrameCommand } from '../src/infrastructure/ffmpeg/commands/extractFrame';
import { resolveFramePath } from '../src/infrastructure/filesystem/paths';
import { ensureDirectories } from '../src/infrastructure/filesystem/ensureDirectories';
import { logger } from '../src/infrastructure/logging/logger';

async function main() {
  const inputPath = process.argv[2];
  const timestamp = parseFloat(process.argv[3] || '1.0');

  if (!inputPath) {
    logger.error('Usage: tsx scripts/extract-frame.ts <input-video> [timestamp-seconds]');
    process.exit(1);
  }

  ensureDirectories();
  const basename = path.basename(inputPath, path.extname(inputPath));
  const outputPath = resolveFramePath(`${basename}_frame_${timestamp.toFixed(2)}.png`);

  try {
    logger.info(`Extracting frame at ${timestamp}s from ${inputPath} -> ${outputPath}`);
    const args = buildExtractFrameCommand({
      inputPath,
      outputPath,
      timestampSeconds: timestamp,
    });
    await FfmpegClient.execute(args);
    logger.info(`Frame extraction complete: ${outputPath}`);
  } catch (error) {
    logger.error('Frame extraction failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
