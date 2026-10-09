export type MediaType = 'video' | 'audio' | 'image' | 'font' | 'subtitle';

export interface MediaMetadata {
  width?: number;
  height?: number;
  durationInSeconds: number;
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
  sampleRate?: number;
  channels?: number;
  pixelFormat?: string;
  bitrate?: number;
}

export interface MediaAsset {
  id: string;
  path: string;
  type: MediaType;
  isNormalized?: boolean;
  metadata?: MediaMetadata;
}
