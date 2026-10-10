import type { VideoProject } from './VideoProject';

/**
 * Calculates the strictly required minimum duration in frames for a given scene,
 * considering incoming crossfades from previous scene and outgoing transitions (fade or crossfade),
 * to prevent timeline invalidity or crossfade crashes.
 */
export function getMinSceneDuration(project: VideoProject, sceneId: string): number {
  const sceneIndex = project.scenes.findIndex((s) => s.id === sceneId);
  if (sceneIndex === -1) return 15;

  const scene = project.scenes[sceneIndex];
  const prevScene = sceneIndex > 0 ? project.scenes[sceneIndex - 1] : undefined;

  const incoming = (prevScene?.transition?.type === 'crossfade' && Number.isFinite(prevScene.transition.durationInFrames))
    ? prevScene.transition.durationInFrames
    : 0;

  const outgoing = (scene.transition && Number.isFinite(scene.transition.durationInFrames))
    ? scene.transition.durationInFrames
    : 0;

  // The scene must be strictly greater than incoming transition (> incoming)
  // The scene must be strictly greater than outgoing transition (> outgoing)
  // Incoming + outgoing overlap must be strictly less than scene duration (< duration)
  const minRequired = Math.max(
    incoming + 1,
    outgoing + 1,
    incoming + outgoing + 1
  );

  return Math.max(15, minRequired);
}
