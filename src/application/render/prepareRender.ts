import path from 'node:path';
import { RenderProfile, RENDER_CONFIG } from '../../config/render.config';
import { PATHS } from '../../config/paths.config';
import { RenderPreparation } from './render.types';
import { ensureDirectories } from '../../infrastructure/filesystem/ensureDirectories';

/**
 * Prepares options and paths for a Remotion render run.
 */
export function prepareRender(compositionId: string, profile: RenderProfile = RenderProfile.Preview): RenderPreparation {
  ensureDirectories();

  const profileSettings = RENDER_CONFIG[profile];
  const targetDir = profile === RenderProfile.Preview ? PATHS.previews : PATHS.output;
  const filename = `${compositionId}_${profile}.mp4`;
  const outputPath = path.resolve(targetDir, filename);
  const entryFile = path.resolve(PATHS.root, 'src', 'index.ts');

  return {
    compositionId,
    outputPath,
    profile: profileSettings,
    entryFile,
  };
}
