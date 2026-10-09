import { execFile, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FfprobeRawResult } from './ffmpeg.types';
import { MediaMetadata } from '../../domain/video/MediaAsset';
import { MediaInspectionError } from '../../shared/errors/pipelineErrors';
import { getEnv } from '../../config/env';
import { logger } from '../logging/logger';

export class FfprobeClient {
  private static cachedBinaryPath: string | null = null;

  /**
   * Resolves the FFprobe binary path robustly across environments.
   */
  static getBinaryPath(): string {
    if (this.cachedBinaryPath) return this.cachedBinaryPath;

    const env = getEnv();
    if (env.ffprobePath && fs.existsSync(env.ffprobePath)) {
      this.cachedBinaryPath = env.ffprobePath;
      return env.ffprobePath;
    }

    try {
      const lookupCmd = process.platform === 'win32' ? 'where ffprobe' : 'which ffprobe';
      const output = execSync(lookupCmd, { stdio: ['pipe', 'pipe', 'ignore'] })
        .toString()
        .trim()
        .split('\r\n')[0]
        .split('\n')[0];
      if (output && fs.existsSync(output)) {
        this.cachedBinaryPath = output;
        return output;
      }
    } catch {
      // PATH check failed
    }

    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const wingetDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
      if (fs.existsSync(wingetDir)) {
        const matches = fs.readdirSync(wingetDir).filter((d) => d.includes('Gyan.FFmpeg'));
        for (const match of matches) {
          const pkgPath = path.join(wingetDir, match);
          const subdirs = fs.readdirSync(pkgPath).filter((d) => d.startsWith('ffmpeg-'));
          for (const subdir of subdirs) {
            const candidate = path.join(pkgPath, subdir, 'bin', 'ffprobe.exe');
            if (fs.existsSync(candidate)) {
              this.cachedBinaryPath = candidate;
              return candidate;
            }
          }
        }
      }
    }

    this.cachedBinaryPath = 'ffprobe';
    return 'ffprobe';
  }

  /**
   * Probes a media file and returns typed MediaMetadata.
   */
  static async probe(filePath: string): Promise<MediaMetadata> {
    if (!fs.existsSync(filePath)) {
      throw new MediaInspectionError(filePath, 'File does not exist on disk.');
    }

    const binary = this.getBinaryPath();
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];

    return new Promise((resolve, reject) => {
      execFile(binary, args, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          return reject(
            new MediaInspectionError(filePath, `FFprobe failed: ${stderr?.toString() || error.message}`)
          );
        }

        try {
          const parsed = JSON.parse(stdout.toString()) as FfprobeRawResult;
          const streams = parsed.streams || [];
          const format = parsed.format || {};

          const videoStream = streams.find((s) => s.codec_type === 'video');
          const audioStream = streams.find((s) => s.codec_type === 'audio');

          let fps: number | undefined;
          if (videoStream?.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
            if (num && den) fps = Math.round((num / den) * 100) / 100;
          }

          const durationStr = format.duration || videoStream?.duration || audioStream?.duration || '0';
          const durationInSeconds = parseFloat(durationStr) || 0;

          const metadata: MediaMetadata = {
            width: videoStream?.width,
            height: videoStream?.height,
            durationInSeconds,
            fps,
            videoCodec: videoStream?.codec_name,
            audioCodec: audioStream?.codec_name,
            sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate, 10) : undefined,
            channels: audioStream?.channels,
            pixelFormat: videoStream?.pix_fmt,
            bitrate: format.bit_rate ? parseInt(format.bit_rate, 10) : undefined,
          };

          logger.debug(`Probed media ${filePath}`, { metadata });
          resolve(metadata);
        } catch (parseError) {
          reject(
            new MediaInspectionError(
              filePath,
              `Failed to parse FFprobe JSON output: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            )
          );
        }
      });
    });
  }
}
