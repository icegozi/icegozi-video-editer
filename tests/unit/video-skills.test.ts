import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listVideoSkills, readVideoSkill } from '../../src/application/assistant/videoSkills';
import { editorCapabilities, EditableProjectSchema } from '../../src/application/assistant/editorCapabilities';
import { TextSceneSchema } from '../../src/schemas/scene.schema';

const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0)) {
    const resolved = fs.realpathSync(directory);
    expect(path.dirname(resolved).toLowerCase()).toBe(fs.realpathSync(os.tmpdir()).toLowerCase());
    expect(path.basename(resolved)).toMatch(/^icegozi-skill-test-/);
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

describe('App-bundled video skills', () => {
  it('discovers metadata and loads each packaged workflow by its trusted ID', () => {
    const catalog = listVideoSkills();
    expect(catalog).toHaveLength(6);
    expect(new Set(catalog.map((skill) => skill.id)).size).toBe(catalog.length);
    for (const metadata of catalog) {
      expect(metadata).not.toHaveProperty('instructions');
      const loaded = readVideoSkill(metadata.id);
      expect(loaded.name).toBe(metadata.name);
      expect(loaded.instructions.length).toBeGreaterThan(100);
    }
  });

  it('blocks path-like IDs and missing skill bundles', () => {
    for (const id of ['../auth', 'C:\\Users\\profile', 'unknown', 'icegozi-text-motion/../../auth']) {
      expect(() => readVideoSkill(id)).toThrow('không thuộc');
    }
    expect(() => readVideoSkill('icegozi-text-motion', path.join(os.tmpdir(), 'missing-skill-bundle'))).toThrow('thiếu hoặc không hợp lệ');
  });

  it('rejects a skill folder junction pointing outside the package root', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-skill-test-'));
    temporary.push(directory);
    const root = path.join(directory, 'skills');
    const outside = path.join(directory, 'private');
    fs.mkdirSync(root); fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'SKILL.md'), 'synthetic private content');
    fs.symlinkSync(outside, path.join(root, 'icegozi-text-motion'), process.platform === 'win32' ? 'junction' : 'dir');
    expect(() => readVideoSkill('icegozi-text-motion', root)).toThrow('thiếu hoặc không hợp lệ');
  });

  it('advertises actual capabilities and validated scale fields', () => {
    const capabilities = editorCapabilities();
    expect(capabilities.sceneTypes).not.toContain('composition');
    expect(capabilities.generation.voice).toBe(false);
    expect(capabilities.rendering.profiles).toContain('final');
    const text = { id: 'a', type: 'text', title: 'A', durationInFrames: 150, animationType: 'scale', fontSize: 72, startScale: 0.25, endScale: 1.5 };
    expect(TextSceneSchema.parse(text).endScale).toBe(1.5);
    for (const invalid of [{ startScale: 0 }, { endScale: 21 }, { fontSize: 513 }, { animationType: 'arbitrary-jsx' }]) {
      expect(() => TextSceneSchema.parse({ ...text, ...invalid })).toThrow();
    }
  });

  it('rejects unsupported scene fields instead of silently accepting an ineffective edit', () => {
    const project = { id: 'a', title: 'A', width: 320, height: 180, fps: 30,
      scenes: [{ id: 'title-a', type: 'text', title: 'A', durationInFrames: 150, unsupportedRotation: 360 }] };
    expect(() => EditableProjectSchema.parse(project)).toThrow('unsupportedRotation');
  });
});
