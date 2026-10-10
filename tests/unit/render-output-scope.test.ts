import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderOutputInScope } from '../../src/infrastructure/server/renderApiPlugin';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) {
    const resolved = fs.realpathSync(directory);
    expect(path.dirname(resolved).toLowerCase()).toBe(fs.realpathSync(os.tmpdir()).toLowerCase());
    expect(path.basename(resolved)).toMatch(/^icegozi-output-scope-/);
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

describe('Render download scope', () => {
  it('allows a writable preview directory outside the installed app', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-output-scope-'));
    directories.push(directory);
    const previews = path.join(directory, 'previews');
    fs.mkdirSync(previews);
    const video = path.join(previews, 'fixture.mp4');
    fs.writeFileSync(video, 'synthetic');
    expect(renderOutputInScope(video, [previews])).toBe(true);
  });

  it('rejects sibling files and junctions escaping the allowed output directory', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-output-scope-'));
    directories.push(directory);
    const previews = path.join(directory, 'previews');
    const outside = path.join(directory, 'private');
    fs.mkdirSync(previews);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'fixture.mp4'), 'synthetic-private');
    fs.symlinkSync(outside, path.join(previews, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    expect(renderOutputInScope(path.join(outside, 'fixture.mp4'), [previews])).toBe(false);
    expect(renderOutputInScope(path.join(previews, 'escape', 'fixture.mp4'), [previews])).toBe(false);
  });
});
