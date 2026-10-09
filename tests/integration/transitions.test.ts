import { describe, it, expect } from 'vitest';
import { buildTimeline } from '../../src/application/timeline/buildTimeline';
import { mockProject } from '../fixtures/mock-project';
import { VideoProject } from '../../src/domain/video/VideoProject';

describe('Transitions & Overlapping Crossfade (Finding I8)', () => {
  it('computes 90 + 90 - 15 = 165 frames for two overlapping scenes with crossfade', () => {
    const project: VideoProject = {
      ...mockProject,
      scenes: [
        {
          id: 'scene-1',
          type: 'text',
          durationInFrames: 90,
          title: 'Scene 1',
          transition: {
            type: 'crossfade',
            durationInFrames: 15,
          },
        },
        {
          id: 'scene-2',
          type: 'text',
          durationInFrames: 90,
          title: 'Scene 2',
        },
      ],
    };

    const timeline = buildTimeline(project);

    // Total duration should be 165 frames
    expect(timeline.totalDurationInFrames).toBe(165);

    // Scene 1: starts at 0, ends at 90
    expect(timeline.computedScenes[0].startFrame).toBe(0);
    expect(timeline.computedScenes[0].durationInFrames).toBe(90);
    expect(timeline.computedScenes[0].endFrame).toBe(90);
    expect(timeline.computedScenes[0].outgoingTransition?.type).toBe('crossfade');

    // Scene 2: starts at 75 (15 frames overlap), ends at 165
    expect(timeline.computedScenes[1].startFrame).toBe(75);
    expect(timeline.computedScenes[1].durationInFrames).toBe(90);
    expect(timeline.computedScenes[1].endFrame).toBe(165);
    expect(timeline.computedScenes[1].incomingTransition?.type).toBe('crossfade');
  });

  it('keeps sequential non-overlapping boundaries for fade-through-black transitions', () => {
    const project: VideoProject = {
      ...mockProject,
      scenes: [
        {
          id: 'scene-1',
          type: 'text',
          durationInFrames: 90,
          title: 'Scene 1',
          transition: {
            type: 'fade',
            durationInFrames: 15,
          },
        },
        {
          id: 'scene-2',
          type: 'text',
          durationInFrames: 90,
          title: 'Scene 2',
        },
      ],
    };

    const timeline = buildTimeline(project);

    // Total duration should be 180 frames (no overlap)
    expect(timeline.totalDurationInFrames).toBe(180);
    expect(timeline.computedScenes[0].startFrame).toBe(0);
    expect(timeline.computedScenes[0].endFrame).toBe(90);
    expect(timeline.computedScenes[1].startFrame).toBe(90);
    expect(timeline.computedScenes[1].endFrame).toBe(180);
  });
});
