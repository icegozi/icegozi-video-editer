import { defaultMainVideoProps } from '../video/compositions/MainVideo/MainVideo.config';
import { buildTimeline } from '../application/timeline/buildTimeline';

const timeline = buildTimeline(defaultMainVideoProps.project!);

export const MAIN_VIDEO_COMPOSITION = {
  id: 'MainVideo',
  fps: defaultMainVideoProps.project!.fps,
  width: defaultMainVideoProps.project!.width,
  height: defaultMainVideoProps.project!.height,
  durationInFrames: timeline.totalDurationInFrames,
  defaultProps: defaultMainVideoProps,
} as const;
