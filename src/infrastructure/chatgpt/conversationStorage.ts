import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export class ConversationStorage {
  private file: string;
  constructor(private directory: string) { this.file = path.join(directory, 'conversations.json'); }
  private prepare(): void {
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    if (fs.realpathSync(this.directory).toLowerCase() !== path.resolve(this.directory).toLowerCase()) throw new Error('Unsafe conversation directory');
  }
  read(): unknown {
    this.prepare();
    if (!fs.existsSync(this.file)) return [];
    if (fs.lstatSync(this.file).isSymbolicLink() || fs.statSync(this.file).size > 8 * 1024 * 1024) throw new Error('Unsafe conversation metadata');
    return JSON.parse(fs.readFileSync(this.file, 'utf8'));
  }
  write(value: unknown): void {
    this.prepare();
    const data = JSON.stringify(value);
    if (Buffer.byteLength(data) > 8 * 1024 * 1024) throw new Error('Conversation metadata limit');
    const temporary = path.join(this.directory, `conversation-${randomUUID()}.tmp`);
    try { fs.writeFileSync(temporary, data, { flag: 'wx', mode: 0o600 }); fs.renameSync(temporary, this.file); }
    finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }
}
