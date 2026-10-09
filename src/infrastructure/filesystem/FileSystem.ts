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
   * Guarantees that public/assets is NEVER cleared.
   */
  static cleanDirectory(dirPath: string): number {
    const resolved = path.resolve(dirPath);
    if (!fs.existsSync(resolved)) return 0;

    // Safety guard: NEVER clean public assets
    if (resolved.startsWith(path.resolve(PATHS.publicAssets))) {
      throw new Error(`Safety violation: Cannot clean public assets directory: ${resolved}`);
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
