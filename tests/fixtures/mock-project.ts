import { VideoProject } from '../../src/domain/video/VideoProject';

export const mockProject: VideoProject = {
  id: 'test-project',
  title: 'Test Project',
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    {
      id: 'scene-1',
      type: 'text',
      durationInFrames: 60,
      title: 'Scene 1',
    },
    {
      id: 'scene-2',
      type: 'formula',
      durationInFrames: 90,
      latex: 'a^2 + b^2 = c^2',
      title: 'Pythagorean Theorem',
    },
    {
      id: 'scene-3',
      type: 'text',
      durationInFrames: 30,
      title: 'Scene 3',
    },
  ],
  audioTracks: [
    {
      id: 'bgm',
      type: 'music',
      src: 'music/ambient.mp3',
      startFrame: 0,
      volume: 0.5,
    },
  ],
};
