import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  resolveAssetPath,
  resolveNormalizedPath,
  resolveFramePath,
  resolveOutputPath,
} from '../../src/infrastructure/filesystem/paths';
import { PATHS } from '../../src/config/paths.config';

describe('Path Utilities & Asset Resolution (Finding I5)', () => {
  it('resolves asset paths within public/assets directory without duplicating assets prefix', () => {
    const r1 = resolveAssetPath('video/clip.mp4');
    expect(r1).toBe(path.resolve(PATHS.publicAssets, 'video', 'clip.mp4'));

    const r2 = resolveAssetPath('assets/video/clip.mp4');
    expect(r2).toBe(path.resolve(PATHS.publicAssets, 'video', 'clip.mp4'));

    const r3 = resolveAssetPath('/assets/video/clip.mp4');
    expect(r3).toBe(path.resolve(PATHS.publicAssets, 'video', 'clip.mp4'));
  });

  it('rejects directory traversal attacks that attempt to escape public/assets', () => {
    expect(() => {
      resolveAssetPath('../../secret.txt');
    }).toThrow(/Asset path escapes public\/assets/);

    expect(() => {
      resolveAssetPath('../../../package.json');
    }).toThrow(/Asset path escapes public\/assets/);
  });

  it('resolves normalized, frame, and output paths safely', () => {
    expect(resolveNormalizedPath('clip.mp4')).toBe(path.resolve(PATHS.normalized, 'clip.mp4'));
    expect(resolveFramePath('frame.png')).toBe(path.resolve(PATHS.frames, 'frame.png'));
    expect(resolveOutputPath('final.mp4')).toBe(path.resolve(PATHS.output, 'final.mp4'));
  });
});
