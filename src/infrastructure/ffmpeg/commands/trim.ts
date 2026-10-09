export interface TrimOptions {
  inputPath: string;
  outputPath: string;
  startSeconds: number;
  durationSeconds?: number;
  reencode?: boolean;
}

/**
 * Builds arguments for trimming a video or audio file.
 */
export function buildTrimCommand(options: TrimOptions): string[] {
  const args = ['-y', '-ss', options.startSeconds.toString(), '-i', options.inputPath];

  if (options.durationSeconds !== undefined) {
    args.push('-t', options.durationSeconds.toString());
  }

  if (options.reencode) {
    args.push('-c:v', 'libx264', '-c:a', 'aac');
  } else {
    args.push('-c', 'copy');
  }

  args.push(options.outputPath);
  return args;
}
