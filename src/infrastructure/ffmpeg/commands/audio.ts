export interface NormalizeAudioOptions {
  inputPath: string;
  outputPath: string;
}

export interface ExtractAudioOptions {
  inputPath: string;
  outputPath: string;
}

/**
 * Builds arguments for extracting audio stream from a video.
 */
export function buildExtractAudioCommand(options: ExtractAudioOptions): string[] {
  return [
    '-y',
    '-i',
    options.inputPath,
    '-vn',
    '-c:a',
    'aac',
    '-ar',
    '48000',
    '-b:a',
    '320k',
    options.outputPath,
  ];
}

/**
 * Builds arguments for EBU R128 loudness normalization.
 */
export function buildNormalizeAudioCommand(options: NormalizeAudioOptions): string[] {
  return [
    '-y',
    '-i',
    options.inputPath,
    '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-c:a',
    'aac',
    '-b:a',
    '320k',
    options.outputPath,
  ];
}
