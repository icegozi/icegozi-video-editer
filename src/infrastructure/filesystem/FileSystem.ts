import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../../config/paths.config';
import { logger } from '../logging/logger';

export class FileSystem {
  static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  static getFileSize(filePath: string): number {
    return fs.statSync(filePath).size;
  }

  static isDirectory(filePath: string): boolean {
    return fs.statSync(filePath).isDirectory();
  }

  static listFiles(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath).map((file) => path.join(dirPath, file));
  }

  /**
   * Safely clears files in a directory without deleting the directory itself.
   * Guarantees that public/assets, project root, and output directories are NEVER cleared.
   * Only directories in the strict allowlist (generated subdirectories) can be cleaned.
   */
  static cleanDirectory(dirPath: string, options?: { allowedDirs?: string[] }): number {
    const resolved = path.resolve(dirPath);
    if (!fs.existsSync(resolved)) return 0;

    const allowed = (options?.allowedDirs ?? [
      PATHS.normalized,
      PATHS.frames,
      PATHS.previews,
      PATHS.temp,
    ]).map((d) => path.resolve(d));

    // Must be in allowlist
    if (!allowed.includes(resolved)) {
      throw new Error(`Safety violation: Directory is not in the clean allowlist: ${resolved}`);
    }

    // Check realpath to guard against symlinks / Windows junctions pointing elsewhere
    const realpath = fs.realpathSync(resolved);
    if (path.relative(resolved, realpath) !== '') {
      throw new Error(`Safety violation: Directory contains symlink/alias resolving elsewhere: ${resolved} -> ${realpath}`);
    }

    // Explicitly forbid cleaning root, public, assets, output, or any parent of assets
    const forbiddenPaths = [
      path.resolve(PATHS.root),
      path.resolve(PATHS.publicAssets),
      path.resolve(PATHS.output),
      path.resolve(PATHS.root, 'public'),
      path.resolve(PATHS.root, 'src'),
    ];

    for (const forbidden of forbiddenPaths) {
      if (resolved === forbidden || path.relative(forbidden, resolved).startsWith('..') && !path.relative(resolved, forbidden).startsWith('..')) {
        // resolved is either forbidden or an ancestor of forbidden
        throw new Error(`Safety violation: Target directory compromises protected location: ${resolved}`);
      }
    }

    let deletedCount = 0;
    const entries = fs.readdirSync(resolved);
    for (const entry of entries) {
      const fullPath = path.join(resolved, entry);
      fs.rmSync(fullPath, { recursive: true, force: true });
      deletedCount++;
    }
    logger.info(`Cleaned directory ${resolved}: ${deletedCount} items removed`);
    return deletedCount;
  }

}
