import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { FfmpegClient } from '../../infrastructure/ffmpeg/FfmpegClient';
import { buildNormalizeCommand } from '../../infrastructure/ffmpeg/commands/normalize';
import { resolveNormalizedPath } from '../../infrastructure/filesystem/paths';
import { logger } from '../../infrastructure/logging/logger';
import { FileSystem } from '../../infrastructure/filesystem/FileSystem';
import { ensureDirectories } from '../../infrastructure/filesystem/ensureDirectories';
import { PATHS } from '../../config/paths.config';

export interface NormalizeMediaResult {
  inputPath: string;
  outputPath: string;
  alreadyNormalized: boolean;
  durationMs: number;
}

// In-flight concurrency map to deduplicate duplicate simultaneous requests for the same source & target
const inFlightNormalizations = new Map<string, Promise<NormalizeMediaResult>>();

/**
 * Normalizes a video file to 1080p, 30fps, H.264, yuv420p, AAC stereo.
 * Writes output strictly into generated/normalized/ to preserve source files.
 * Uses sha256 fingerprinting of source identity & target settings to prevent cache collision.
 */
export async function normalizeMedia(
  inputPath: string,
  options: { forceReencode?: boolean; targetWidth?: number; targetHeight?: number; targetFps?: number } = {}
): Promise<NormalizeMediaResult> {
  ensureDirectories();

  const resolvedInput = path.resolve(inputPath);
  if (!FileSystem.exists(resolvedInput)) {
    throw new Error(`Cannot normalize media: input file does not exist at ${resolvedInput}`);
  }

  const stat = fs.statSync(resolvedInput);
  const targetWidth = options.targetWidth ?? 1920;
  const targetHeight = options.targetHeight ?? 1080;
  const targetFps = options.targetFps ?? 30;

  // Compute deterministic fingerprint of source identity (resolved path, size, mtime) and targets
  const fingerprintData = {
    sourcePath: resolvedInput,
    size: stat.size,
    mtimeMs: Math.round(stat.mtimeMs),
    targetWidth,
    targetHeight,
    targetFps,
  };

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprintData))
    .digest('hex')
    .slice(0, 16);

  const basename = path.basename(resolvedInput, path.extname(resolvedInput));
  const outputPath = resolveNormalizedPath(`${basename}_${hash}_normalized.mp4`);

  // Fast path: cached output exists and is non-empty
  if (FileSystem.exists(outputPath) && !options.forceReencode) {
    const outStat = fs.statSync(outputPath);
    if (outStat.size > 1000) {
      logger.info(`Asset already normalized (cache hit): ${outputPath}`);
      return {
        inputPath: resolvedInput,
        outputPath,
        alreadyNormalized: true,
        durationMs: 0,
      };
    }
  }

  // Deduplicate concurrent requests for the exact same source fingerprint
  const existingJob = inFlightNormalizations.get(hash);
  if (existingJob) {
    logger.info(`Joining existing in-flight normalization job for: ${basename} [${hash}]`);
    return existingJob;
  }

  const executionPromise = (async () => {
    // Write to isolated temporary file first
    const tempFilename = `norm_${hash}_${Date.now()}_temp.mp4`;
    const tempOutputPath = path.resolve(PATHS.temp, tempFilename);

    try {
      logger.info(`Starting normalization for ${resolvedInput} -> ${tempOutputPath} (target: ${targetWidth}x${targetHeight} @ ${targetFps}fps)`);
      const commandArgs = buildNormalizeCommand({
        inputPath: resolvedInput,
        outputPath: tempOutputPath,
        targetWidth,
        targetHeight,
        targetFps,
      });

      const startTime = Date.now();
      await FfmpegClient.execute(commandArgs);
      const durationMs = Date.now() - startTime;

      // Validate output was written and non-empty
      if (!fs.existsSync(tempOutputPath) || fs.statSync(tempOutputPath).size === 0) {
        throw new Error(`Normalization failed: FFmpeg did not produce a valid output file at ${tempOutputPath}`);
      }

      // Atomic promotion: move completed temporary file to canonical cache path
      fs.renameSync(tempOutputPath, outputPath);

      logger.info(`Normalization complete in ${durationMs}ms: ${outputPath}`);
      return {
        inputPath: resolvedInput,
        outputPath,
        alreadyNormalized: false,
        durationMs,
      };
    } catch (error) {
      // Clean up incomplete temp file on failure
      if (fs.existsSync(tempOutputPath)) {
        try {
          fs.unlinkSync(tempOutputPath);
        } catch {
          // Ignore temp cleanup error
        }
      }
      throw error;
    } finally {
      inFlightNormalizations.delete(hash);
    }
  })();

  inFlightNormalizations.set(hash, executionPromise);
  return executionPromise;
}
