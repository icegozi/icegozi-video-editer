import { SceneConfig } from './Scene';

/**
 * Standardized track assignment helper across Timeline UI, MainVideo renderer,
 * and lock validation.
 *
 * Rules:
 * - If the project contains any primary media (video or image scenes):
 *   - Text & Formula scenes belong to overlay track 'V2'.
 *   - Primary media scenes belong to base track 'V1'.
 * - If the project contains ONLY text and formula scenes:
 *   - All scenes belong to base track 'V1' (matching standard UI layout).
 */
export function getSceneTrackId(scene: SceneConfig, allScenes: SceneConfig[]): 'V1' | 'V2' {
  const hasPrimaryMedia = allScenes.some(
    (s) => s.type !== 'text' && s.type !== 'formula'
  );

  const isOverlayType = scene.type === 'text' || scene.type === 'formula';

  if (hasPrimaryMedia && isOverlayType) {
    return 'V2';
  }

  return 'V1';
}
