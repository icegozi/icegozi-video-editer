import fs from 'node:fs';
import { VideoProject } from '../../domain/video/VideoProject';
import { MediaNotFoundError } from '../../shared/errors/pipelineErrors';
import { logger } from '../../infrastructure/logging/logger';
import { resolveAssetPath } from '../../infrastructure/filesystem/paths';

export interface AssetValidationResult {
  valid: boolean;
  checkedAssetsCount: number;
  missingAssets: string[];
}

/**
 * Validates that all media referenced by scenes and audio tracks exist on disk.
 * Runs prior to long rendering sessions to fail early if assets are missing.
 */
export function validateAssets(project: VideoProject): AssetValidationResult {
  const missingAssets: string[] = [];
  let checkedCount = 0;

  for (const scene of project.scenes) {
    if (scene.type === 'video' || scene.type === 'image') {
      checkedCount++;
      const src = scene.src;
      // If it's a relative path in public/assets or absolute path
      const resolved = fs.existsSync(src) ? src : resolveAssetPath(src);
      if (!fs.existsSync(resolved)) {
        logger.error(`Missing asset in scene "${scene.id}": ${src} (resolved: ${resolved})`);
        missingAssets.push(src);
      }
    }
  }

  if (project.audioTracks) {
    for (const track of project.audioTracks) {
      checkedCount++;
      const src = track.src;
      const resolved = fs.existsSync(src) ? src : resolveAssetPath(src);
      if (!fs.existsSync(resolved)) {
        logger.error(`Missing audio track asset "${track.id}": ${src} (resolved: ${resolved})`);
        missingAssets.push(src);
      }
    }
  }

  const valid = missingAssets.length === 0;
  if (!valid) {
    throw new MediaNotFoundError(missingAssets[0], {
      totalMissing: missingAssets.length,
      missingList: missingAssets,
      projectId: project.id,
    });
  }

  logger.info(`Validated ${checkedCount} project assets successfully. All files exist.`);
  return { valid: true, checkedAssetsCount: checkedCount, missingAssets: [] };
}
