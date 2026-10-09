import { SceneConfig } from './Scene';

export interface ComputedScene<T extends SceneConfig = SceneConfig> {
  scene: T;
  startFrame: number;
  durationInFrames: number;
  endFrame: number;
}

export interface ProjectTimeline {
  totalDurationInFrames: number;
  totalDurationInSeconds: number;
  fps: number;
  computedScenes: ComputedScene[];
}
