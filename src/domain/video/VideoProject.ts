import { SceneConfig } from './Scene';
import { AudioTrackConfig } from './AudioTrack';

export interface VideoProject {
  id: string;
  title: string;
  fps: number;
  width: number;
  height: number;
  scenes: SceneConfig[];
  audioTracks?: AudioTrackConfig[];
  metadata?: Record<string, unknown>;
}
