import { SceneConfig } from './Scene';
import { TransitionConfig } from './Transition';

export interface ComputedScene<T extends SceneConfig = SceneConfig> {
  scene: T;
  startFrame: number;
  durationInFrames: number;
  endFrame: number;
  incomingTransition?: TransitionConfig;
  outgoingTransition?: TransitionConfig;
}

export interface ProjectTimeline {
  totalDurationInFrames: number;
  totalDurationInSeconds: number;
  fps: number;
  computedScenes: ComputedScene[];
}
