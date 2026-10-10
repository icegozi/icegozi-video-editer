import { execFile } from 'node:child_process';
import { FfmpegExecutionResult } from './ffmpeg.types';
import { FfmpegError } from '../../shared/errors/pipelineErrors';
import { logger } from '../logging/logger';
import { resolveMediaBinary } from './MediaBinaryResolver';

export class FfmpegClient {
  /**
   * Resolves the FFmpeg binary path robustly across Windows and Unix environments.
   */
  static getBinaryPath(): string {
    return resolveMediaBinary('ffmpeg');
  }

  /**
   * Executes an FFmpeg command with safe argument arrays.
   */
  static async execute(args: string[], options: { cwd?: string; timeoutMs?: number } = {}): Promise<FfmpegExecutionResult> {
    const binary = this.getBinaryPath();
    const startTime = Date.now();

    logger.debug(`FFmpeg command executing: ${binary} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      execFile(
        binary,
        args,
        {
          cwd: options.cwd || process.cwd(),
          timeout: options.timeoutMs || 300_000, // 5 min default timeout
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const stdoutStr = stdout?.toString() || '';
          const stderrStr = stderr?.toString() || '';

          if (error) {
            const exitCode = typeof error.code === 'number' ? error.code : 1;
            logger.error(`FFmpeg command failed with code ${exitCode}`, {
              args,
              durationMs,
              stderr: stderrStr.slice(-300),
            });
            return reject(
              new FfmpegError('FFmpeg execution failed', exitCode, `${binary} ${args.join(' ')}`, stderrStr)
            );
          }

          logger.debug(`FFmpeg command completed in ${durationMs}ms`);
          resolve({
            command: `${binary} ${args.join(' ')}`,
            args,
            stdout: stdoutStr,
            stderr: stderrStr,
            durationMs,
          });
        }
      );
    });
  }
}
