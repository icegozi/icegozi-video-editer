import path from 'node:path';
import { PATHS } from '../../config/paths.config';

/**
 * Resolves an asset path within public/assets.
 * Ensures the path does not escape the assets directory.
 */
export function resolveAssetPath(relativePath: string): string {
  const normalized = relativePath
    .replace(/\\/g, '/')
    .replace(/^\/?(public\/)?assets\//, '')
    .replace(/^\//, '');

  const resolved = path.resolve(PATHS.publicAssets, normalized);
  const relative = path.relative(PATHS.publicAssets, resolved);

  if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`) || relative.startsWith('../')) {
    throw new Error(`Asset path escapes public/assets: ${relativePath}`);
  }

  return resolved;
}


/**
 * Resolves a normalized intermediate file path.
 */
export function resolveNormalizedPath(filename: string): string {
  return path.resolve(PATHS.normalized, path.basename(filename));
}

/**
 * Resolves an extracted frame path.
 */
export function resolveFramePath(filename: string): string {
  return path.resolve(PATHS.frames, path.basename(filename));
}

/**
 * Resolves an output render file path.
 */
export function resolveOutputPath(filename: string): string {
  return path.resolve(PATHS.output, path.basename(filename));
}

/**
 * Resolves a preview render file path.
 */
export function resolvePreviewPath(filename: string): string {
  return path.resolve(PATHS.previews, path.basename(filename));
}
