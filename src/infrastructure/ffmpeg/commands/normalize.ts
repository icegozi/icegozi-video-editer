export interface NormalizeOptions {
  inputPath: string;
  outputPath: string;
  targetWidth?: number;
  targetHeight?: number;
  targetFps?: number;
}

/**
 * Builds arguments for standardizing media to 1080p H.264 yuv420p 30fps AAC 48kHz.
 */
export function buildNormalizeCommand(options: NormalizeOptions): string[] {
  const width = options.targetWidth || 1920;
  const height = options.targetHeight || 1080;
  const fps = options.targetFps || 30;

  // Scale preserving aspect ratio and pad to exact dimensions
  const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

  return [
    '-y',
    '-i',
    options.inputPath,
    '-vf',
    videoFilter,
    '-r',
    fps.toString(),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-c:a',
    'aac',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-b:a',
    '320k',
    options.outputPath,
  ];
}
