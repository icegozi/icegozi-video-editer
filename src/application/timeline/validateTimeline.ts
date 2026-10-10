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

    if (item.endFrame > timeline.totalDurationInFrames) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" end frame (${item.endFrame}) exceeds timeline total duration (${timeline.totalDurationInFrames}).`,
        { sceneId: item.scene.id }
      );
    }

    const incoming =
      item.incomingTransition?.type === 'crossfade'
        ? item.incomingTransition.durationInFrames
        : 0;

    const outgoing =
      i < timeline.computedScenes.length - 1 && item.outgoingTransition?.type === 'crossfade'
        ? item.outgoingTransition.durationInFrames
        : 0;

    if (incoming >= item.durationInFrames) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" incoming crossfade duration (${incoming}) must be strictly less than scene duration (${item.durationInFrames}).`,
        { sceneId: item.scene.id }
      );
    }

    if (outgoing >= item.durationInFrames) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" outgoing crossfade duration (${outgoing}) must be strictly less than scene duration (${item.durationInFrames}).`,
        { sceneId: item.scene.id }
      );
    }

    if (incoming + outgoing > item.durationInFrames) {
      throw new InvalidTimelineError(
        `Scene "${item.scene.id}" combined incoming (${incoming}) and outgoing (${outgoing}) crossfade overlap (${incoming + outgoing}) cannot exceed scene duration (${item.durationInFrames}).`,
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

      if (item.scene.transition.type === 'crossfade' && i < timeline.computedScenes.length - 1) {
        const nextScene = timeline.computedScenes[i + 1];
        if (transDuration >= nextScene.durationInFrames) {
          throw new InvalidTimelineError(
            `Crossfade duration (${transDuration}) for scene "${item.scene.id}" must be strictly less than next scene "${nextScene.scene.id}" duration (${nextScene.durationInFrames}).`
          );
        }
      }
    }
  }
}

