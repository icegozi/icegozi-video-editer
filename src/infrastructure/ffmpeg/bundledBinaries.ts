import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export function bundledMediaBinary(name: 'ffmpeg' | 'ffprobe'): string | null {
  if (process.platform !== 'win32' || process.arch !== 'x64') return null;
  try {
    const require = createRequire(import.meta.url);
    const directory = path.dirname(
      require.resolve('@remotion/compositor-win32-x64-msvc/package.json'),
    );
    const file = path.join(directory, `${name}.exe`);
    return fs.existsSync(file) ? file : null;
  } catch {
    return null;
  }
}
