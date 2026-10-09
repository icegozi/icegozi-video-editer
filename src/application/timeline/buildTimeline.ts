import { VideoProject } from '../../domain/video/VideoProject';
import { ProjectTimeline, ComputedScene } from '../../domain/video/Timeline';
import { framesToSeconds } from './calculateDuration';
import { validateTimeline } from './validateTimeline';

/**
 * Builds a deterministic ProjectTimeline from a VideoProject definition.
 * Sequentially arranges scenes and calculates frame boundaries.
 */
export function buildTimeline(project: VideoProject): ProjectTimeline {
  const computedScenes: ComputedScene[] = [];
  let currentStartFrame = 0;

  for (let i = 0; i < project.scenes.length; i++) {
    const scene = project.scenes[i];
    const duration = scene.durationInFrames;

    // When previous scene has an outgoing crossfade transition, overlap scenes
    if (i > 0) {
      const prevScene = project.scenes[i - 1];
      if (prevScene.transition?.type === 'crossfade') {
        const overlap = prevScene.transition.durationInFrames;
        currentStartFrame -= overlap;
      }
    }

    const incomingTransition = i > 0 && project.scenes[i - 1].transition?.type === 'crossfade'
      ? project.scenes[i - 1].transition
      : undefined;
    const outgoingTransition = scene.transition;

    const computed: ComputedScene = {
      scene,
      startFrame: currentStartFrame,
      durationInFrames: duration,
      endFrame: currentStartFrame + duration,
      incomingTransition,
      outgoingTransition,
    };

    computedScenes.push(computed);
    currentStartFrame += duration;
  }



  const totalDurationInFrames = currentStartFrame;
  const totalDurationInSeconds = framesToSeconds(totalDurationInFrames, project.fps);

  const timeline: ProjectTimeline = {
    totalDurationInFrames,
    totalDurationInSeconds,
    fps: project.fps,
    computedScenes,
  };

  validateTimeline(timeline);
  return timeline;
}
