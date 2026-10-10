import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { CredentialEncryption } from '../chatgpt/devkit/types';
import { AssistantError } from '../../application/assistant/errors';
import { lock } from 'proper-lockfile';

export class GenerationSecureStore {
  private cache = new Map<string, { signature: string; value: unknown }>();
  constructor(
    private directory: string,
    private encryption: CredentialEncryption,
  ) {}
  private file(owner: string): string {
    if (!this.encryption.isAvailable())
      throw new AssistantError(
        'secure_storage_unavailable',
        'Kết nối Google cần kho bảo mật Windows DPAPI.',
      );
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const actual = fs.realpathSync(this.directory);
    if (actual.toLowerCase() !== path.resolve(this.directory).toLowerCase())
      throw new AssistantError('secure_storage_path', 'Kho kết nối không hợp lệ.');
    const file = path.join(actual, createHash('sha256').update(owner).digest('hex') + '.enc');
    if (
      fs.existsSync(file) &&
      (fs.lstatSync(file).isSymbolicLink() || fs.statSync(file).size > 128 * 1024)
    )
      throw new AssistantError('secure_storage_path', 'File kết nối không hợp lệ.');
    return file;
  }
  async read(owner: string): Promise<unknown | null> {
    const file = this.file(owner);
    if (!fs.existsSync(file)) {
      this.cache.delete(owner);
      return null;
    }
    const signature = () => {
      const stat = fs.statSync(file);
      return `${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
    };
    const before = signature();
    const cached = this.cache.get(owner);
    if (cached?.signature === before) return structuredClone(cached.value);
    try {
      const value: unknown = JSON.parse(await this.encryption.decrypt(fs.readFileSync(file)));
      if (signature() !== before)
        throw new AssistantError('owner_changed', 'Kết nối Google vừa thay đổi.');
      this.cache.set(owner, { signature: before, value });
      return structuredClone(value);
    } catch {
      throw new AssistantError(
        'credential_unreadable',
        'Không đọc được kết nối Google của tài khoản Windows này. Hãy cấu hình lại.',
      );
    }
  }
  async write(
    owner: string,
    value: unknown,
    stillCurrent: () => boolean = () => true,
    expectedVersion?: string,
  ): Promise<void> {
    const encrypted = await this.encryption.encrypt(JSON.stringify(value));
    if (!stillCurrent())
      throw new AssistantError('owner_changed', 'Phiên lưu kết nối đã thay đổi.');
    const file = this.file(owner);
    const temp = file + '.' + randomUUID() + '.tmp';
    const release = await lock(this.directory, {
      realpath: true,
      lockfilePath: file + '.lock',
      stale: 60000,
      update: 15000,
      retries: { retries: 4, minTimeout: 50, maxTimeout: 200 },
    });
    try {
      if (!stillCurrent())
        throw new AssistantError('owner_changed', 'Phiên lưu kết nối đã thay đổi.');
      if (expectedVersion !== undefined) {
        const existing: unknown = fs.existsSync(file)
          ? JSON.parse(await this.encryption.decrypt(fs.readFileSync(file)))
          : null;
        if (
          !existing ||
          typeof existing !== 'object' ||
          !('version' in existing) ||
          existing.version !== expectedVersion
        ) {
          throw new AssistantError(
            'owner_changed',
            'Kết nối Google vừa được thay đổi ở một bản app khác.',
          );
        }
      }
      if (!stillCurrent())
        throw new AssistantError('owner_changed', 'Phiên lưu kết nối đã thay đổi.');
      fs.writeFileSync(temp, encrypted, { flag: 'wx', mode: 0o600 });
      fs.renameSync(temp, file);
      this.cache.delete(owner);
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
      await release();
    }
  }
  forget(owner?: string) {
    if (owner) this.cache.delete(owner);
    else this.cache.clear();
  }
}
