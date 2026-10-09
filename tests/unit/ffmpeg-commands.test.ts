import { describe, it, expect } from 'vitest';
import { buildTrimCommand } from '../../src/infrastructure/ffmpeg/commands/trim';
import { buildConcatCommand } from '../../src/infrastructure/ffmpeg/commands/concat';
import { buildNormalizeCommand } from '../../src/infrastructure/ffmpeg/commands/normalize';
import { buildExtractFrameCommand } from '../../src/infrastructure/ffmpeg/commands/extractFrame';
import { buildNormalizeAudioCommand } from '../../src/infrastructure/ffmpeg/commands/audio';

describe('FFmpeg Command Builders', () => {
  it('builds trim command arguments correctly', () => {
    const args = buildTrimCommand({
      inputPath: 'input.mp4',
      outputPath: 'output.mp4',
      startSeconds: 5,
      durationSeconds: 10,
    });

    expect(args).toEqual(['-y', '-ss', '5', '-i', 'input.mp4', '-t', '10', '-c', 'copy', 'output.mp4']);
  });

  it('builds normalize command arguments correctly', () => {
    const args = buildNormalizeCommand({
      inputPath: 'raw.mov',
      outputPath: 'normalized.mp4',
      targetWidth: 1920,
      targetHeight: 1080,
      targetFps: 30,
    });

    expect(args).toContain('-i');
    expect(args).toContain('raw.mov');
    expect(args).toContain('-r');
    expect(args).toContain('30');
    expect(args).toContain('libx264');
    expect(args).toContain('aac');
    expect(args[args.length - 1]).toBe('normalized.mp4');
  });

  it('builds concat command arguments correctly', () => {
    const args = buildConcatCommand({
      manifestPath: 'list.txt',
      outputPath: 'joined.mp4',
    });

    expect(args).toEqual([
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'list.txt',
      '-c',
      'copy',
      'joined.mp4',
    ]);
  });

  it('builds extract frame command arguments correctly', () => {
    const args = buildExtractFrameCommand({
      inputPath: 'clip.mp4',
      outputPath: 'frame.png',
      timestampSeconds: 2.5,
    });

    expect(args).toEqual([
      '-y',
      '-ss',
      '2.5',
      '-i',
      'clip.mp4',
      '-vframes',
      '1',
      '-q:v',
      '2',
      'frame.png',
    ]);
  });

  it('builds audio loudness normalization command correctly', () => {
    const args = buildNormalizeAudioCommand({
      inputPath: 'voice.wav',
      outputPath: 'voice_norm.aac',
    });

    expect(args).toContain('-af');
    expect(args).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
    expect(args[args.length - 1]).toBe('voice_norm.aac');
  });
});
