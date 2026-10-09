export enum RenderProfile {
  Preview = 'preview',
  Final = 'final',
}

export interface RenderProfileSettings {
  name: RenderProfile;
  width: number;
  height: number;
  crf: number;
  jpegQuality: number;
  concurrency: number | null;
  codec: 'h264' | 'h265';
  pixelFormat: 'yuv420p';
  outputDirectory: string;
}

export const RENDER_CONFIG: Record<RenderProfile, RenderProfileSettings> = {
  [RenderProfile.Preview]: {
    name: RenderProfile.Preview,
    width: 1280,
    height: 720,
    crf: 28,
    jpegQuality: 75,
    concurrency: null, // Remotion calculates based on CPU cores
    codec: 'h264',
    pixelFormat: 'yuv420p',
    outputDirectory: 'generated/previews',
  },
  [RenderProfile.Final]: {
    name: RenderProfile.Final,
    width: 1920,
    height: 1080,
    crf: 18,
    jpegQuality: 90,
    concurrency: null,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    outputDirectory: 'output',
  },
};
