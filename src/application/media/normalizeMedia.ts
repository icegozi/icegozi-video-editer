import path from 'node:path';
import { FfmpegClient } from '../../infrastructure/ffmpeg/FfmpegClient';
import { buildNormalizeCommand } from '../../infrastructure/ffmpeg/commands/normalize';
import { resolveNormalizedPath } from '../../infrastructure/filesystem/paths';
import { logger } from '../../infrastructure/logging/logger';
import { FileSystem } from '../../infrastructure/filesystem/FileSystem';
import { ensureDirectories } from '../../infrastructure/filesystem/ensureDirectories';

export interface NormalizeMediaResult {
  inputPath: string;
  outputPath: string;
  alreadyNormalized: boolean;
  durationMs: number;
}

/**
 * Normalizes a video file to 1080p, 30fps, H.264, yuv420p, AAC stereo.
 * Writes output strictly into generated/normalized/ to preserve source files.
 */
export async function normalizeMedia(
  inputPath: string,
  options: { forceReencode?: boolean; targetWidth?: number; targetHeight?: number; targetFps?: number } = {}
): Promise<NormalizeMediaResult> {
  ensureDirectories();

  if (!FileSystem.exists(inputPath)) {
    throw new Error(`Cannot normalize media: input file does not exist at ${inputPath}`);
  }

  const basename = path.basename(inputPath, path.extname(inputPath));
  const outputPath = resolveNormalizedPath(`${basename}_normalized.mp4`);

  if (FileSystem.exists(outputPath) && !options.forceReencode) {
    logger.info(`Asset already normalized: ${outputPath}`);
    return {
      inputPath,
      outputPath,
      alreadyNormalized: true,
      durationMs: 0,
    };
  }

  logger.info(`Starting normalization for ${inputPath} -> ${outputPath}`);
  const commandArgs = buildNormalizeCommand({
    inputPath,
    outputPath,
    targetWidth: options.targetWidth,
    targetHeight: options.targetHeight,
    targetFps: options.targetFps,
  });

  const startTime = Date.now();
  await FfmpegClient.execute(commandArgs);
  const durationMs = Date.now() - startTime;

  logger.info(`Normalization complete in ${durationMs}ms: ${outputPath}`);
  return {
    inputPath,
    outputPath,
    alreadyNormalized: false,
    durationMs,
  };
}
