import { describe, it, expect } from 'vitest';
import {
  framesToPixels,
  pixelsToFrames,
  findSnapFrame,
} from '../../src/editor/geometry/timelineGeometry';
import {
  formatTimecode,
  formatDurationSeconds,
  parseTimecode,
} from '../../src/editor/geometry/timecode';

describe('Editor Timeline Geometry Math', () => {
  it('correctly converts frames to pixels and back at standard 30fps and 120pps', () => {
    const fps = 30;
    const pps = 120; // 120 pixels per second -> 4 pixels per frame
    const frames = 90; // 3 seconds

    const pixels = framesToPixels(frames, fps, pps);
    expect(pixels).toBe(360);

    const backToFrames = pixelsToFrames(pixels, fps, pps);
    expect(backToFrames).toBe(90);
  });

  it('snaps to candidate frames within threshold distance', () => {
    const fps = 30;
    const pps = 120; // 4px per frame, threshold is 6px (i.e. ~1.5 frames)
    const candidates = [0, 90, 180, 240];

    // Target frame 89 is 1 frame away (4px), should snap to 90
    const snapResult1 = findSnapFrame(89, candidates, fps, pps, 6);
    expect(snapResult1.isSnapped).toBe(true);
    expect(snapResult1.snappedFrame).toBe(90);

    // Target frame 50 is far away, should not snap
    const snapResult2 = findSnapFrame(50, candidates, fps, pps, 6);
    expect(snapResult2.isSnapped).toBe(false);
    expect(snapResult2.snappedFrame).toBe(50);
  });
});

describe('Editor Timecode Formatting', () => {
  it('formats frames into standard SMPTE timecode (HH:MM:SS:FF)', () => {
    const fps = 30;
    expect(formatTimecode(0, fps)).toBe('00:00:00:00');
    expect(formatTimecode(15, fps)).toBe('00:00:00:15');
    expect(formatTimecode(30, fps)).toBe('00:00:01:00');
    expect(formatTimecode(240, fps)).toBe('00:00:08:00');
    expect(formatTimecode(3600 * 30, fps)).toBe('01:00:00:00');
  });

  it('formats seconds into human readable duration string', () => {
    expect(formatDurationSeconds(8.0)).toBe('00:08.00');
    expect(formatDurationSeconds(65.5)).toBe('01:05.50');
  });

  it('parses timecode back to frame integers accurately', () => {
    const fps = 30;
    expect(parseTimecode('00:00:01:00', fps)).toBe(30);
    expect(parseTimecode('00:00:08:00', fps)).toBe(240);
  });
});
