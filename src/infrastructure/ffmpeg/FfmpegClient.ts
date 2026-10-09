import { execFile, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FfmpegExecutionResult } from './ffmpeg.types';
import { FfmpegError } from '../../shared/errors/pipelineErrors';
import { logger } from '../logging/logger';
import { getEnv } from '../../config/env';

export class FfmpegClient {
  private static cachedBinaryPath: string | null = null;

  /**
   * Resolves the FFmpeg binary path robustly across Windows and Unix environments.
   */
  static getBinaryPath(): string {
    if (this.cachedBinaryPath) return this.cachedBinaryPath;

    const env = getEnv();
    if (env.ffmpegPath && fs.existsSync(env.ffmpegPath)) {
      this.cachedBinaryPath = env.ffmpegPath;
      return env.ffmpegPath;
    }

    // Attempt system PATH check
    try {
      const lookupCmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
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
      // PATH lookup failed, proceed to fallback detection
    }

    // Windows WinGet fallback check
    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const wingetDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
      if (fs.existsSync(wingetDir)) {
        const matches = fs.readdirSync(wingetDir).filter((d) => d.includes('Gyan.FFmpeg'));
        for (const match of matches) {
          const pkgPath = path.join(wingetDir, match);
          const subdirs = fs.readdirSync(pkgPath).filter((d) => d.startsWith('ffmpeg-'));
          for (const subdir of subdirs) {
            const candidate = path.join(pkgPath, subdir, 'bin', 'ffmpeg.exe');
            if (fs.existsSync(candidate)) {
              this.cachedBinaryPath = candidate;
              return candidate;
            }
          }
        }
      }
    }

    // Default system command name fallback
    this.cachedBinaryPath = 'ffmpeg';
    return 'ffmpeg';
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
