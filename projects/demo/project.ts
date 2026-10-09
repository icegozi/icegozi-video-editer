import { VideoProject } from '../../src/domain/video/VideoProject';

/**
 * Minimal demo project demonstrating declarative scenes, mathematical formulas,
 * typography, and transitions without copyright-restricted external assets.
 * Total duration: 240 frames = 8 seconds at 30 fps.
 */
export const demoProject: VideoProject = {
  id: 'demo-math-beauty',
  title: 'The Beauty of Mathematics',
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    {
      id: 'scene-intro',
      type: 'text',
      durationInFrames: 90, // 3 seconds
      title: 'ELEGANCE OF NATURE',
      subtitle: 'Where Mathematics Meets Art',
      backgroundColor: '#070A12',
      textColor: '#FFFFFF',
      animationType: 'slide-up',
      transition: {
        type: 'fade',
        durationInFrames: 15,
      },
    },
    {
      id: 'scene-formula',
      type: 'formula',
      durationInFrames: 90, // 3 seconds
      latex: 'e^{i\\pi} + 1 = 0',
      title: "Euler's Identity",
      explanation: 'Uniting the fundamental constants of the universe: e, i, pi, 1, and 0.',
      fontSize: 72,
      textColor: '#F8FAFC',
      backgroundColor: '#0F172A',
      transition: {
        type: 'fade',
        durationInFrames: 15,
      },
    },
    {
      id: 'scene-outro',
      type: 'text',
      durationInFrames: 60, // 2 seconds
      title: 'ICEGOZI VIDEO',
      subtitle: 'Programmable Media Pipeline',
      backgroundColor: '#030712',
      textColor: '#38BDF8',
      animationType: 'fade',
    },
  ],
  metadata: {
    author: 'Icegozi Pipeline',
    tags: ['math', 'architecture', 'demo'],
  },
};
