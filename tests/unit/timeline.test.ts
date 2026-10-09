import { describe, it, expect } from 'vitest';
import { secondsToFrames, framesToSeconds } from '../../src/application/timeline/calculateDuration';
import { buildTimeline } from '../../src/application/timeline/buildTimeline';
import { validateTimeline } from '../../src/application/timeline/validateTimeline';
import { mockProject } from '../fixtures/mock-project';
import { InvalidTimelineError } from '../../src/shared/errors/pipelineErrors';

describe('Timeline Engine', () => {
  describe('calculateDuration', () => {
    it('converts seconds to frames correctly', () => {
      expect(secondsToFrames(1, 30)).toBe(30);
      expect(secondsToFrames(2.5, 30)).toBe(75);
      expect(secondsToFrames(0, 60)).toBe(0);
    });

    it('converts frames to seconds correctly', () => {
      expect(framesToSeconds(60, 30)).toBe(2);
      expect(framesToSeconds(45, 30)).toBe(1.5);
    });

    it('throws error on negative inputs or zero FPS', () => {
      expect(() => secondsToFrames(-1, 30)).toThrow();
      expect(() => secondsToFrames(1, 0)).toThrow();
      expect(() => framesToSeconds(-10, 30)).toThrow();
      expect(() => framesToSeconds(30, -5)).toThrow();
    });
  });

  describe('buildTimeline', () => {
    it('builds sequential scene boundaries accurately', () => {
      const timeline = buildTimeline(mockProject);

      expect(timeline.fps).toBe(30);
      expect(timeline.computedScenes).toHaveLength(3);

      // Scene 1: 60 frames (0..60)
      expect(timeline.computedScenes[0].startFrame).toBe(0);
      expect(timeline.computedScenes[0].durationInFrames).toBe(60);
      expect(timeline.computedScenes[0].endFrame).toBe(60);

      // Scene 2: 90 frames (60..150)
      expect(timeline.computedScenes[1].startFrame).toBe(60);
      expect(timeline.computedScenes[1].durationInFrames).toBe(90);
      expect(timeline.computedScenes[1].endFrame).toBe(150);

      // Scene 3: 30 frames (150..180)
      expect(timeline.computedScenes[2].startFrame).toBe(150);
      expect(timeline.computedScenes[2].durationInFrames).toBe(30);
      expect(timeline.computedScenes[2].endFrame).toBe(180);

      expect(timeline.totalDurationInFrames).toBe(180);
      expect(timeline.totalDurationInSeconds).toBe(6);
    });

    it('accurately computes overlapping boundaries for crossfade transitions (Finding I8)', () => {
      const crossfadeProject = {
        ...mockProject,
        scenes: [
          {
            ...mockProject.scenes[0],
            durationInFrames: 90,
            transition: { type: 'crossfade' as const, durationInFrames: 15 },
          },
          {
            ...mockProject.scenes[1],
            durationInFrames: 90,
          },
        ],
      };

      const timeline = buildTimeline(crossfadeProject);

      expect(timeline.computedScenes[0].startFrame).toBe(0);
      expect(timeline.computedScenes[0].endFrame).toBe(90);
      expect(timeline.computedScenes[1].startFrame).toBe(75); // Overlaps by 15 frames
      expect(timeline.computedScenes[1].endFrame).toBe(165);
      expect(timeline.totalDurationInFrames).toBe(165); // 90 + 90 - 15 = 165 frames
    });
  });

  describe('validateTimeline', () => {
    it('throws InvalidTimelineError when scenes have non-positive durations', () => {
      const invalidTimeline = {
        fps: 30,
        totalDurationInFrames: 0,
        totalDurationInSeconds: 0,
        computedScenes: [],
      };

      expect(() => validateTimeline(invalidTimeline)).toThrow(InvalidTimelineError);
    });

    it('rejects non-finite frame values (Finding M3)', () => {
      const nanTimeline = {
        fps: 30,
        totalDurationInFrames: NaN,
        totalDurationInSeconds: NaN,
        computedScenes: [
          {
            scene: mockProject.scenes[0],
            startFrame: 0,
            durationInFrames: NaN,
            endFrame: NaN,
          },
        ],
      };

      expect(() => validateTimeline(nanTimeline as any)).toThrow(InvalidTimelineError);
    });
  });
});

