import { SceneConfig } from './Scene';
import { AudioTrackConfig } from './AudioTrack';

export interface SubtitleCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface TrackSetting {
  muted?: boolean;
  hidden?: boolean;
  locked?: boolean;
}

export interface VideoProject {
  schemaVersion?: number;
  id: string;
  title: string;
  fps: number;
  width: number;
  height: number;
  scenes: SceneConfig[];
  audioTracks?: AudioTrackConfig[];
  subtitles?: SubtitleCue[];
  trackSettings?: Record<string, TrackSetting>;
  metadata?: Record<string, unknown>;
}

