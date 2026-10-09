import { StringDecoder } from 'node:string_decoder';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { AssistantError } from '../../application/assistant/errors';

export type RpcId = string | number;
export interface RpcMessage { id?: RpcId; method?: string; params?: unknown; result?: unknown; error?: unknown }

export class JsonlParser {
  private decoder = new StringDecoder('utf8');
  private buffer = '';
  constructor(private readonly receive: (message: RpcMessage) => void, private readonly maxBytes = 1024 * 1024) {}
  push(chunk: Buffer): void {
    this.buffer += this.decoder.write(chunk);
    let newline: number;
    while ((newline = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newline + 1);
      if (Buffer.byteLength(line) > this.maxBytes) throw new Error('RPC message too large');
      if (!line.trim()) continue;
      const value: unknown = JSON.parse(line);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid RPC message');
      const message = value as RpcMessage;
      if (message.id !== undefined && typeof message.id !== 'string' && typeof message.id !== 'number') throw new Error('Invalid RPC ID');
      if (message.method !== undefined && typeof message.method !== 'string') throw new Error('Invalid RPC method');
      if (message.method === undefined && message.id === undefined) throw new Error('Invalid RPC envelope');
      this.receive(message);
    }
    if (Buffer.byteLength(this.buffer) > this.maxBytes) throw new Error('RPC buffer too large');
  }
  finish(): void {
    this.buffer += this.decoder.end();
    if (this.buffer.trim()) throw new Error('Truncated RPC message');
  }
}

export class JsonlClient {
  private pending = new Map<RpcId, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private sequence = 0;
  private initialized = false;
  private closed = false;
  private parser: JsonlParser;
  onNotification: (message: RpcMessage) => void = () => undefined;
  onServerRequest: (message: RpcMessage) => void = () => undefined;
  onClose: () => void = () => undefined;

  constructor(private child: ChildProcessWithoutNullStreams) {
    this.parser = new JsonlParser((message) => this.receive(message));
    child.stdout.on('data', this.handleData);
    child.stdout.on('end', this.handleEnd);
    child.stdin.on('error', this.handleClose);
    child.on('error', this.handleClose);
    child.on('close', this.handleClose);
    // Raw stderr can contain login details or user payloads. It is deliberately discarded.
    child.stderr.resume();
  }
  private handleData = (chunk: Buffer) => {
    try { this.parser.push(chunk); } catch { this.dispose(); }
  };
  private handleEnd = () => { try { this.parser.finish(); } catch { /* EOF is never turn success. */ } finally { this.dispose(); } };
  private handleClose = () => this.dispose();
  private receive(message: RpcMessage): void {
    if (message.method !== undefined) {
      if (message.id !== undefined) this.onServerRequest(message);
      else this.onNotification(message);
      return;
    }
    const pending = message.id === undefined ? undefined : this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id!);
    clearTimeout(pending.timer);
    if (message.error !== undefined) pending.reject(new AssistantError('runtime_rpc', 'Runtime từ chối yêu cầu. Kiểm tra model/quyền hoặc đăng nhập lại.'));
    else pending.resolve(message.result);
  }
  private write(message: object): void {
    const line = JSON.stringify(message) + '\n';
    if (this.closed || Buffer.byteLength(line) > 1024 * 1024 || this.child.stdin.writableLength > 2 * 1024 * 1024) {
      throw new AssistantError('runtime_closed', 'Runtime mất kết nối hoặc payload quá lớn. Hãy kết nối lại.');
    }
    this.child.stdin.write(line);
  }
  async initialize(): Promise<void> {
    await this.request('initialize', { clientInfo: { name: 'icegozi-video', title: 'ICEGOZI Video', version: '1.0.0' }, capabilities: { experimentalApi: true } });
    this.write({ method: 'initialized' });
    this.initialized = true;
  }
  request(method: string, params: unknown, timeout = 30_000): Promise<unknown> {
    if ((!this.initialized && method !== 'initialize') || this.closed || this.pending.size >= 128) {
      return Promise.reject(new AssistantError('runtime_not_ready', 'Runtime chưa sẵn sàng.'));
    }
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new AssistantError('runtime_timeout', 'Runtime không trả lời đúng hạn. Tác vụ không được tự gửi lại.'));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      try { this.write({ id, method, params }); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  respond(id: RpcId, result: unknown): void { this.write({ id, result }); }
  rejectRequest(id: RpcId): void { this.write({ id, error: { code: -32601, message: 'Unsupported or stale application request' } }); }
  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new AssistantError('runtime_closed', 'Codex đã đóng/crash. Draft được giữ lại; hãy chủ động thử lại.'));
    }
    this.pending.clear();
    this.child.stdout.off('data', this.handleData);
    this.child.stdout.off('end', this.handleEnd);
    this.child.stdin.off('error', this.handleClose);
    this.child.off('error', this.handleClose);
    this.child.off('close', this.handleClose);
    this.child.stdin.destroy();
    this.child.stdout.destroy();
    this.child.stderr.destroy();
    if (!this.child.killed) this.child.kill();
    this.onClose();
  }
}
