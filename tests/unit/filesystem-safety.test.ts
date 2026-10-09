import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FileSystem } from '../../src/infrastructure/filesystem/FileSystem';
import { PATHS } from '../../src/config/paths.config';

describe('FileSystem Safety & Cleanup Guard (Finding C1)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-safety-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects attempt to clean public/assets', () => {
    expect(() => {
      FileSystem.cleanDirectory(PATHS.publicAssets);
    }).toThrow(/Safety violation/);
  });

  it('rejects attempt to clean project root', () => {
    expect(() => {
      FileSystem.cleanDirectory(PATHS.root);
    }).toThrow(/Safety violation/);
  });

  it('rejects attempt to clean public directory (parent of assets)', () => {
    expect(() => {
      FileSystem.cleanDirectory(path.resolve(PATHS.root, 'public'));
    }).toThrow(/Safety violation/);
  });

  it('rejects attempt to clean output directory', () => {
    expect(() => {
      FileSystem.cleanDirectory(PATHS.output);
    }).toThrow(/Safety violation/);
  });

  it('rejects arbitrary directory not in allowlist', () => {
    const arbitraryDir = path.join(tempDir, 'arbitrary');
    fs.mkdirSync(arbitraryDir);
    fs.writeFileSync(path.join(arbitraryDir, 'file.txt'), 'content');

    expect(() => {
      FileSystem.cleanDirectory(arbitraryDir);
    }).toThrow(/not in the clean allowlist/);
  });

  it('successfully cleans an allowed directory without removing the directory itself', () => {
    const safeSubDir = path.join(tempDir, 'allowed_temp');
    fs.mkdirSync(safeSubDir);
    fs.writeFileSync(path.join(safeSubDir, 'temp1.txt'), 'data1');
    fs.writeFileSync(path.join(safeSubDir, 'temp2.txt'), 'data2');

    // Test with explicit allowedDirs override on temporary testing folder
    const removed = FileSystem.cleanDirectory(safeSubDir, {
      allowedDirs: [safeSubDir],
    });

    expect(removed).toBe(2);
    expect(fs.existsSync(safeSubDir)).toBe(true);
    expect(fs.readdirSync(safeSubDir).length).toBe(0);
  });
});
