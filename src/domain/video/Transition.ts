export type TransitionType = 'none' | 'fade' | 'crossfade';

export interface TransitionConfig {
  type: TransitionType;
  durationInFrames: number;
}
