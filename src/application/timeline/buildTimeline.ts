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

  for (const scene of project.scenes) {
    const duration = scene.durationInFrames;
    const computed: ComputedScene = {
      scene,
      startFrame: currentStartFrame,
      durationInFrames: duration,
      endFrame: currentStartFrame + duration,
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
