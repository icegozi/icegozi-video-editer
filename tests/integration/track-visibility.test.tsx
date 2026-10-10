import { describe, it, expect } from 'vitest';
import React from 'react';
import { getSceneTrackId } from '../../src/domain/video/trackUtils';
import { buildTimeline } from '../../src/application/timeline/buildTimeline';
import { VideoProject } from '../../src/domain/video/VideoProject';
import { mockProject } from '../fixtures/mock-project';

describe('Track Assignment & Visibility Semantics (Finding I7 / T11)', () => {
  const mixedProject: VideoProject = {
    ...mockProject,
    id: 'mixed-track-project',
    title: 'Mixed Video + Overlay Project',
    scenes: [
      {
        id: 'scene-video-1',
        type: 'video',
        src: 'assets/video/bg.mp4',
        durationInFrames: 120,
      },
      {
        id: 'scene-text-1',
        type: 'text',
        title: 'Title Overlay',
        durationInFrames: 60,
      },
      {
        id: 'scene-formula-1',
        type: 'formula',
        latex: 'E=mc^2',
        durationInFrames: 60,
      },
    ],
  };

  const textOnlyProject: VideoProject = {
    ...mockProject,
    id: 'text-only-project',
    title: 'Text Only Project',
    scenes: [
      {
        id: 'scene-text-a',
        type: 'text',
        title: 'Section 1',
        durationInFrames: 90,
      },
      {
        id: 'scene-text-b',
        type: 'text',
        title: 'Section 2',
        durationInFrames: 90,
      },
    ],
  };

  it('assigns primary media to V1 and text/formula to V2 when project contains primary media', () => {
    const videoTrack = getSceneTrackId(mixedProject.scenes[0], mixedProject.scenes);
    const textTrack = getSceneTrackId(mixedProject.scenes[1], mixedProject.scenes);
    const formulaTrack = getSceneTrackId(mixedProject.scenes[2], mixedProject.scenes);

    expect(videoTrack).toBe('V1');
    expect(textTrack).toBe('V2');
    expect(formulaTrack).toBe('V2');
  });

  it('assigns all scenes to V1 when project is text-only without primary media', () => {
    const trackA = getSceneTrackId(textOnlyProject.scenes[0], textOnlyProject.scenes);
    const trackB = getSceneTrackId(textOnlyProject.scenes[1], textOnlyProject.scenes);

    expect(trackA).toBe('V1');
    expect(trackB).toBe('V1');
  });

  it('preserves exact timeline duration when tracks are hidden', () => {
    const baselineTimeline = buildTimeline(mixedProject);
    const hiddenV1Project: VideoProject = {
      ...mixedProject,
      trackSettings: {
        V1: { hidden: true, locked: false },
      },
    };
    const hiddenV1Timeline = buildTimeline(hiddenV1Project);
    expect(hiddenV1Timeline.totalDurationInFrames).toBe(baselineTimeline.totalDurationInFrames);

    const hiddenV2Project: VideoProject = {
      ...mixedProject,
      trackSettings: {
        V2: { hidden: true, locked: false },
      },
    };
    const hiddenV2Timeline = buildTimeline(hiddenV2Project);
    expect(hiddenV2Timeline.totalDurationInFrames).toBe(baselineTimeline.totalDurationInFrames);
  });

  it('filters visible scenes independently based on trackSettings V1 and V2', () => {
    const timeline = buildTimeline(mixedProject);
    const hasPrimary = mixedProject.scenes.some((s) => s.type !== 'text' && s.type !== 'formula');

    // Case 1: V1 hidden, V2 visible
    const projectV1Hidden: VideoProject = {
      ...mixedProject,
      trackSettings: {
        V1: { hidden: true },
        V2: { hidden: false },
      },
    };

    const visibleV1Hidden = timeline.computedScenes.filter(({ scene }) => {
      const track = getSceneTrackId(scene, mixedProject.scenes);
      return !projectV1Hidden.trackSettings?.[track]?.hidden;
    });

    // Only text and formula (V2) should be visible; video (V1) is excluded
    expect(visibleV1Hidden.map((s) => s.scene.id)).toEqual(['scene-text-1', 'scene-formula-1']);

    // Case 2: V2 hidden, V1 visible
    const projectV2Hidden: VideoProject = {
      ...mixedProject,
      trackSettings: {
        V1: { hidden: false },
        V2: { hidden: true },
      },
    };

    const visibleV2Hidden = timeline.computedScenes.filter(({ scene }) => {
      const track = getSceneTrackId(scene, mixedProject.scenes);
      return !projectV2Hidden.trackSettings?.[track]?.hidden;
    });

    // Only video (V1) should be visible; text/formula (V2) are excluded
    expect(visibleV2Hidden.map((s) => s.scene.id)).toEqual(['scene-video-1']);
  });
});
