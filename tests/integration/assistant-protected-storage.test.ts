import { describe, expect, it } from 'vitest';
import { mkdtemp, realpath, rm, mkdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { windowsCredentialEncryption } from '../../src/infrastructure/chatgpt/protectedStorage';
import { ConnectionStore } from '../../src/infrastructure/chatgpt/devkit/storage';

describe('Windows protected credentials', () => {
  it.skipIf(process.platform !== 'win32')('roundtrips a synthetic credential through current-user DPAPI', async () => {
    const provider = windowsCredentialEncryption();
    const plaintext = 'synthetic-protected-credential-test';
    const encrypted = await provider.encrypt(plaintext);
    expect(Buffer.from(encrypted).toString('utf8')).not.toContain(plaintext);
    expect(await provider.decrypt(encrypted)).toBe(plaintext);
  }, 30000);
  it.skipIf(process.platform !== 'win32')('refuses Windows junction ancestors for auth storage', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'icegozi-junction-test-'));
    try {
      const target = path.join(directory, 'target'); await mkdir(target);
      const junction = path.join(directory, 'redirect'); await symlink(target, junction, 'junction');
      const store = new ConnectionStore(path.join(junction, 'auth'), windowsCredentialEncryption());
      await expect(store.withLock(() => store.read())).rejects.toMatchObject({ code: 'storage_unsafe' });
    } finally {
      const resolved = await realpath(directory);
      expect(path.dirname(resolved).toLowerCase()).toBe((await realpath(os.tmpdir())).toLowerCase());
      expect(path.basename(resolved).startsWith('icegozi-junction-test-')).toBe(true);
      await rm(resolved, { recursive: true, force: true });
    }
  });
});
