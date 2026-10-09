export interface ExtractFrameOptions {
  inputPath: string;
  outputPath: string;
  timestampSeconds: number;
}

/**
 * Builds arguments for extracting a single high-quality frame image (PNG).
 */
export function buildExtractFrameCommand(options: ExtractFrameOptions): string[] {
  return [
    '-y',
    '-ss',
    options.timestampSeconds.toString(),
    '-i',
    options.inputPath,
    '-vframes',
    '1',
    '-q:v',
    '2',
    options.outputPath,
  ];
}
