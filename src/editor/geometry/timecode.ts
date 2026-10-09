/**
 * Timecode formatting and parsing utilities.
 */

export function formatTimecode(frames: number, fps: number): string {
  const safeFrames = Math.max(0, Math.floor(frames));
  const f = safeFrames % fps;
  const totalSeconds = Math.floor(safeFrames / fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

export function formatDurationSeconds(seconds: number): string {
  const s = Math.floor(seconds) % 60;
  const m = Math.floor(seconds / 60);
  const ms = Math.floor((seconds % 1) * 100);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(m)}:${pad(s)}.${pad(ms)}`;
}

export function parseTimecode(timecode: string, fps: number): number {
  const parts = timecode.split(':').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  const [h, m, s, f] = parts;
  return h * 3600 * fps + m * 60 * fps + s * fps + f;
}
