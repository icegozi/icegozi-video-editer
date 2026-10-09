import { ProjectTimeline } from '../../domain/video/Timeline';
import { InvalidTimelineError } from '../../shared/errors/pipelineErrors';

/**
 * Validates a calculated project timeline.
 * Fails early if any frame values are zero, negative, or overlapping unexpectedly.
 */
export function validateTimeline(timeline: ProjectTimeline): void {
  if (timeline.fps <= 0) {
    throw new InvalidTimelineError(`Invalid FPS: ${timeline.fps}`);
  }

  if (timeline.computedScenes.length === 0) {
    throw new InvalidTimelineError('Project contains no scenes.');
  }

  if (timeline.totalDurationInFrames <= 0) {
    throw new InvalidTimelineError(
      `Total duration must be greater than zero, got ${timeline.totalDurationInFrames}`
    );
  }

  for (let i = 0; i < timeline.computedScenes.length; i++) {
    const item = timeline.computedScenes[i];
    if (item.durationInFrames <= 0) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" has invalid duration: ${item.durationInFrames} frames`,
        { sceneId: item.scene.id }
      );
    }

    if (item.startFrame < 0) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" has negative start frame: ${item.startFrame}`,
        { sceneId: item.scene.id }
      );
    }

    if (item.endFrame !== item.startFrame + item.durationInFrames) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" endFrame mismatch: expected ${item.startFrame + item.durationInFrames}, got ${item.endFrame}`,
        { sceneId: item.scene.id }
      );
    }
  }
}
