import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolveAssetPath, resolveNormalizedPath, resolveFramePath, resolveOutputPath } from '../../src/infrastructure/filesystem/paths';
import { PATHS } from '../../src/config/paths.config';

describe('Path Utilities', () => {
  it('resolves asset paths within public/assets directory', () => {
    const resolved = resolveAssetPath('video/clip.mp4');
    expect(resolved).toBe(path.resolve(PATHS.publicAssets, 'video', 'clip.mp4'));
  });

  it('prevents directory traversal attacks in asset paths', () => {
    const dangerous = '../../secret.txt';
    const resolved = resolveAssetPath(dangerous);
    expect(resolved.startsWith(PATHS.publicAssets)).toBe(true);
  });

  it('resolves normalized, frame, and output paths safely', () => {
    expect(resolveNormalizedPath('clip.mp4')).toBe(path.resolve(PATHS.normalized, 'clip.mp4'));
    expect(resolveFramePath('frame.png')).toBe(path.resolve(PATHS.frames, 'frame.png'));
    expect(resolveOutputPath('final.mp4')).toBe(path.resolve(PATHS.output, 'final.mp4'));
  });
});
