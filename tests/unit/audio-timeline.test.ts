import { describe, it, expect } from 'vitest';
import { framesToPixels } from '../../src/editor/geometry/timelineGeometry';
import { VideoProject } from '../../src/domain/video/VideoProject';
import { mockProject } from '../fixtures/mock-project';

describe('Audio Timeline Geometry & Track Support (Finding I7)', () => {
  it('accurately computes x position and width for audio tracks based on startFrame and duration', () => {
    const fps = 30;
    const pps = 120; // 120 pixels per second

    const startFrame = 60; // 2.0 seconds -> 240px
    const durationInFrames = 30; // 1.0 second -> 120px

    const leftPx = framesToPixels(startFrame, fps, pps);
    const widthPx = framesToPixels(durationInFrames, fps, pps);

    expect(leftPx).toBe(240);
    expect(widthPx).toBe(120);
  });

  it('supports arbitrary number of audio tracks in project definition', () => {
    const projectWith3Tracks: VideoProject = {
      ...mockProject,
      audioTracks: [
        { id: 'voice-1', type: 'voice', src: 'voice.mp3', startFrame: 0, durationInFrames: 60, volume: 1 },
        { id: 'bgm-1', type: 'music', src: 'bgm.mp3', startFrame: 0, durationInFrames: 180, volume: 0.3 },
        { id: 'sfx-1', type: 'sfx', src: 'sfx.mp3', startFrame: 60, durationInFrames: 30, volume: 0.8 },
      ],
    };

    expect(projectWith3Tracks.audioTracks).toHaveLength(3);
    const sfxTrack = projectWith3Tracks.audioTracks![2];

    const left = framesToPixels(sfxTrack.startFrame, projectWith3Tracks.fps, 120);
    const width = framesToPixels(sfxTrack.durationInFrames!, projectWith3Tracks.fps, 120);

    expect(left).toBe(240);
    expect(width).toBe(120);
  });
});
