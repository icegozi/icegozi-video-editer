export type AudioTrackType = 'voice' | 'music' | 'sfx';

export interface AudioTrackConfig {
  id: string;
  type: AudioTrackType;
  src: string;
  startFrame: number;
  durationInFrames?: number;
  volume: number; // 0.0 to 1.0
  fadeInFrames?: number;
  fadeOutFrames?: number;
  loop?: boolean;
}
