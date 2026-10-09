export interface FfprobeStream {
  codec_type?: 'video' | 'audio' | 'subtitle';
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  pix_fmt?: string;
  sample_rate?: string;
  channels?: number;
  duration?: string;
  bit_rate?: string;
}

export interface FfprobeFormat {
  duration?: string;
  size?: string;
  bit_rate?: string;
  format_name?: string;
}

export interface FfprobeRawResult {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

export interface FfmpegExecutionResult {
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  durationMs: number;
}
