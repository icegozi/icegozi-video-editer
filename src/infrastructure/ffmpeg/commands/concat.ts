export interface ConcatOptions {
  manifestPath: string;
  outputPath: string;
}

/**
 * Builds arguments for concatenating media using the concat demuxer.
 */
export function buildConcatCommand(options: ConcatOptions): string[] {
  return [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    options.manifestPath,
    '-c',
    'copy',
    options.outputPath,
  ];
}
