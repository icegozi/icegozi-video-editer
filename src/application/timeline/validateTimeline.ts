import { ProjectTimeline } from '../../domain/video/Timeline';
import { InvalidTimelineError } from '../../shared/errors/pipelineErrors';

/**
 * Validates a calculated project timeline.
 * Fails early if any frame values are zero, negative, or overlapping unexpectedly.
 */
export function validateTimeline(timeline: ProjectTimeline): void {
  if (!Number.isFinite(timeline.fps) || timeline.fps <= 0) {
    throw new InvalidTimelineError(`Invalid FPS: ${timeline.fps}`);
  }

  if (timeline.computedScenes.length === 0) {
    throw new InvalidTimelineError('Project contains no scenes.');
  }

  if (!Number.isFinite(timeline.totalDurationInFrames) || timeline.totalDurationInFrames <= 0) {
    throw new InvalidTimelineError(
      `Total duration must be a finite positive number, got ${timeline.totalDurationInFrames}`
    );
  }

  for (let i = 0; i < timeline.computedScenes.length; i++) {
    const item = timeline.computedScenes[i];
    if (!Number.isFinite(item.durationInFrames) || item.durationInFrames <= 0) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" has invalid duration: ${item.durationInFrames} frames`,
        { sceneId: item.scene.id }
      );
    }

    if (!Number.isFinite(item.startFrame) || item.startFrame < 0) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" has negative or non-finite start frame: ${item.startFrame}`,
        { sceneId: item.scene.id }
      );
    }

    if (item.endFrame !== item.startFrame + item.durationInFrames) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" endFrame mismatch: expected ${item.startFrame + item.durationInFrames}, got ${item.endFrame}`,
        { sceneId: item.scene.id }
      );
    }

    if (item.scene.transition) {
      const transDuration = item.scene.transition.durationInFrames;
      if (!Number.isFinite(transDuration) || transDuration <= 0) {
        throw new InvalidTimelineError(
          `Scene "${item.scene.id}" has invalid transition duration: ${transDuration}`
        );
      }
      if (transDuration >= item.durationInFrames) {
        throw new InvalidTimelineError(
          `Scene "${item.scene.id}" transition duration (${transDuration}) must be strictly less than scene duration (${item.durationInFrames})`
        );
      }
    }
  }
}

