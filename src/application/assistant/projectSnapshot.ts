import { SnapshotSchema, type ProjectSnapshot } from './assistant.contracts';
import { AssistantError } from './errors';
import { projectAssets } from './projectProposals';

/** Validates the bounded project context that may cross into the assistant runtime. */
export function validateProjectSnapshot(raw: unknown): ProjectSnapshot {
  const snapshot = SnapshotSchema.parse(raw);
  if (
    snapshot.project.scenes.length > 500 ||
    (snapshot.project.audioTracks?.length ?? 0) > 100 ||
    (snapshot.project.subtitles?.length ?? 0) > 2000
  ) {
    throw new AssistantError(
      'context_large',
      'Project quá lớn cho MVP. Giảm số scene/track trước khi gửi.',
    );
  }
  if (Buffer.byteLength(JSON.stringify(snapshot)) > 256 * 1024) {
    throw new AssistantError('context_large', 'Snapshot quá lớn cho MVP.');
  }
  if (snapshot.project.scenes.some((scene) => scene.type === 'composition')) {
    throw new AssistantError(
      'composition_scope',
      'MVP chỉ hỗ trợ scene text/formula/image/video; composition với props tùy ý cần sandbox riêng.',
    );
  }
  for (const source of projectAssets(snapshot.project)) {
    const isLocalAsset =
      /^(?:assets\/)?[a-zA-Z0-9_\-./ ]+$/.test(source) &&
      !source.split('/').some((part) => part === '..' || part.startsWith('.')) &&
      !source.includes('//');
    if (!isLocalAsset) {
      throw new AssistantError(
        'asset_path',
        'Chỉ cho phép asset local thuộc public/assets; không gửi đường dẫn máy hoặc URL ngoài.',
      );
    }
  }
  return structuredClone(snapshot);
}
