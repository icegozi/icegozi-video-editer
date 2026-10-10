import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../../config/paths.config';
import { resolveAssetPath } from './paths';
import { projectAssets } from '../../application/assistant/projectProposals';
import type { VideoProject } from '../../domain/video/VideoProject';
import { AssistantError } from '../../application/assistant/errors';

export function validateAssistantAssets(project: VideoProject): void {
  const assets = projectAssets(project);
  if (!assets.length) return;
  const root = fs.realpathSync(PATHS.publicAssets);
  for (const key of assets) {
    const target = resolveAssetPath(key);
    if (!fs.existsSync(target)) throw new AssistantError('media_missing', 'Thiếu media trong public/assets. Import media trước khi render.');
    const relative = path.relative(root, fs.realpathSync(target));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(target).isFile()) throw new AssistantError('asset_path', 'Asset qua symlink/junction hoặc ngoài thư mục cho phép.', 403);
  }
}
