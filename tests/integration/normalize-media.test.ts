import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { normalizeMedia } from '../../src/application/media/normalizeMedia';
import { FfmpegClient } from '../../src/infrastructure/ffmpeg/FfmpegClient';

describe('Normalize Media Cache Fingerprinting & Concurrency (Finding I4)', () => {
  let tempDir: string;
  let dirA: string;
  let dirB: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-norm-test-'));
    dirA = path.join(tempDir, 'dirA');
    dirB = path.join(tempDir, 'dirB');
    fs.mkdirSync(dirA);
    fs.mkdirSync(dirB);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('generates different cache paths for files with same basename in different directories or different content', async () => {
    const fileA = path.join(dirA, 'sample.mp4');
    const fileB = path.join(dirB, 'sample.mp4');

    fs.writeFileSync(fileA, 'dummy video content A');
    fs.writeFileSync(fileB, 'different dummy content B for video');

    // Mock FfmpegClient to simulate ffmpeg output write
    vi.spyOn(FfmpegClient, 'execute').mockImplementation(async (args) => {
      const outPath = args[args.length - 1];
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, 'fake normalized mp4 data of decent size > 1000 bytes'.repeat(30));
      return { command: 'ffmpeg', args, stdout: '', stderr: '', durationMs: 1 };
    });

    const resA = await normalizeMedia(fileA);
    const resB = await normalizeMedia(fileB);

    // Outputs must be distinct to prevent cache poisoning between same-basename files
    expect(resA.outputPath).not.toBe(resB.outputPath);
    expect(resA.outputPath).toContain('sample_');
    expect(resB.outputPath).toContain('sample_');
  });

  it('generates different cache paths when target dimensions/FPS differ', async () => {
    const file = path.join(dirA, 'clip.mp4');
    fs.writeFileSync(file, 'dummy video content');

    vi.spyOn(FfmpegClient, 'execute').mockImplementation(async (args) => {
      const outPath = args[args.length - 1];
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, 'fake normalized mp4 data of decent size > 1000 bytes'.repeat(30));
      return { command: 'ffmpeg', args, stdout: '', stderr: '', durationMs: 1 };
    });

    const res1080p = await normalizeMedia(file, { targetWidth: 1920, targetHeight: 1080 });
    const res720p = await normalizeMedia(file, { targetWidth: 1280, targetHeight: 720 });

    expect(res1080p.outputPath).not.toBe(res720p.outputPath);
  });

  it('deduplicates simultaneous concurrent requests for the exact same media', async () => {
    const file = path.join(dirA, 'concurrent.mp4');
    fs.writeFileSync(file, 'concurrent video data');

    let execCount = 0;
    vi.spyOn(FfmpegClient, 'execute').mockImplementation(async (args) => {
      execCount++;
      // Simulate delay
      await new Promise((r) => setTimeout(r, 20));
      const outPath = args[args.length - 1];
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, 'fake normalized mp4 data of decent size > 1000 bytes'.repeat(30));
      return { command: 'ffmpeg', args, stdout: '', stderr: '', durationMs: 1 };
    });

    // Launch 2 parallel normalization requests for the same source
    const [p1, p2] = await Promise.all([
      normalizeMedia(file),
      normalizeMedia(file),
    ]);

    expect(p1.outputPath).toBe(p2.outputPath);
    expect(execCount).toBe(1); // Exactly one ffmpeg execution ran!
  });
});
