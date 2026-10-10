import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getEnv } from '../../config/env';
import { bundledMediaBinary } from './bundledBinaries';

export type MediaBinaryName = 'ffmpeg' | 'ffprobe';

const resolvedBinaries = new Map<MediaBinaryName, string>();

function configuredBinary(name: MediaBinaryName): string | undefined {
  const env = getEnv();
  return name === 'ffmpeg' ? env.ffmpegPath : env.ffprobePath;
}

function systemBinary(name: MediaBinaryName): string | null {
  try {
    const command = process.platform === 'win32' ? 'where.exe' : 'which';
    const output = execFileSync(command, [name], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split(/\r?\n/, 1)[0];
    return output && fs.existsSync(output) ? output : null;
  } catch {
    return null;
  }
}

function wingetBinary(name: MediaBinaryName): string | null {
  if (process.platform !== 'win32') return null;
  const packagesDirectory = path.join(
    process.env.LOCALAPPDATA ?? '',
    'Microsoft',
    'WinGet',
    'Packages',
  );
  if (!fs.existsSync(packagesDirectory)) return null;

  for (const packageName of fs.readdirSync(packagesDirectory)) {
    if (!packageName.includes('Gyan.FFmpeg')) continue;
    const packageDirectory = path.join(packagesDirectory, packageName);
    for (const versionDirectory of fs.readdirSync(packageDirectory)) {
      if (!versionDirectory.startsWith('ffmpeg-')) continue;
      const candidate = path.join(
        packageDirectory,
        versionDirectory,
        'bin',
        `${name}.exe`,
      );
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export function resolveMediaBinary(name: MediaBinaryName): string {
  const cached = resolvedBinaries.get(name);
  if (cached) return cached;

  const configured = configuredBinary(name);
  const resolved =
    (configured && fs.existsSync(configured) ? configured : null) ??
    bundledMediaBinary(name) ??
    systemBinary(name) ??
    wingetBinary(name) ??
    name;
  resolvedBinaries.set(name, resolved);
  return resolved;
}

export function resetMediaBinaryResolver(): void {
  resolvedBinaries.clear();
}
