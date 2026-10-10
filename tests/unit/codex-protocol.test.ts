import { describe, expect, it, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { JsonlClient, JsonlParser, type RpcMessage } from '../../src/infrastructure/codex/jsonlClient';
import { runtimeArguments } from '../../src/infrastructure/codex/runtime';

function fixture() {
  const emitter = new EventEmitter();
  const process = Object.assign(emitter, { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), killed: false,
    kill: vi.fn(() => { emitter.emit('close', 0); return true; }),
  });
  const client = new JsonlClient(process as unknown as ChildProcessWithoutNullStreams);
  const sent: RpcMessage[] = [];
  process.stdin.on('data', (chunk: Buffer) => sent.push(JSON.parse(chunk.toString()) as RpcMessage));
  const initialized = async () => {
    const ready = client.initialize();
    process.stdout.write(JSON.stringify({ id: sent.at(-1)!.id, result: {} }) + '\n');
    await ready;
  };
  return { process, client, sent, initialized };
}
afterEach(() => vi.useRealTimers());
describe('Codex JSONL lifecycle', () => {
  it('parses byte-fragmented UTF8, CRLF and multiple messages', () => {
    const messages: RpcMessage[] = [];
    const parser = new JsonlParser((message) => messages.push(message));
    const encoded = Buffer.from('{"method":"delta","params":"tiếng Việt"}\r\n{"id":3,"result":true}\n');
    for (const byte of encoded) parser.push(Buffer.from([byte]));
    parser.finish();
    expect(messages).toEqual([{ method: 'delta', params: 'tiếng Việt' }, { id: 3, result: true }]);
  });
  it('rejects malformed, oversized and truncated messages', () => {
    expect(() => new JsonlParser(() => undefined).push(Buffer.from('{bad}\n'))).toThrow();
    expect(() => new JsonlParser(() => undefined, 4).push(Buffer.from('12345'))).toThrow();
    const parser = new JsonlParser(() => undefined); parser.push(Buffer.from('{'));
    expect(() => parser.finish()).toThrow();
  });
  it('gates handshake and correlates out-of-order responses separately from server requests', async () => {
    const f = fixture();
    await expect(f.client.request('thread/start', {})).rejects.toThrow('chưa');
    await f.initialized();
    const a = f.client.request('a', {}); const aId = f.sent.at(-1)!.id;
    const b = f.client.request('b', {}); const bId = f.sent.at(-1)!.id;
    const serverRequest = vi.fn(); f.client.onServerRequest = serverRequest;
    f.process.stdout.write(JSON.stringify({ id: aId, method: 'item/tool/call', params: {} }) + '\n');
    expect(serverRequest).toHaveBeenCalledOnce();
    f.process.stdout.write(JSON.stringify({ id: bId, result: 'B' }) + '\n' + JSON.stringify({ id: aId, result: 'A' }) + '\n');
    expect(await b).toBe('B'); expect(await a).toBe('A');
    await f.client.stop();
    expect(f.process.kill).toHaveBeenCalledOnce();
    expect(f.process.listenerCount('close')).toBe(0);
  });
  it('rejects timeouts/process exit and never replays pending tasks', async () => {
    const f = fixture(); await f.initialized(); vi.useFakeTimers();
    const waiting = f.client.request('turn/start', {}, 10);
    const rejected = expect(waiting).rejects.toThrow('đúng hạn');
    await vi.advanceTimersByTimeAsync(11); await rejected;
    const next = f.client.request('turn/start', {}); const closed = expect(next).rejects.toThrow('đóng');
    f.process.emit('close', 1); await closed;
    expect(f.sent.filter((m) => m.method === 'turn/start')).toHaveLength(2);
  });
  it('keeps token out of argv and disables built-in machine tools', () => {
    const argv = runtimeArguments().join(' ');
    expect(argv).toContain('env_key="ACCESS_TOKEN"');
    expect(argv).toContain('features.shell_tool=false');
    expect(argv).toContain('features.code_mode=true');
    expect(argv).toContain('features.code_mode_host=true');
    expect(argv).not.toContain('features.code_mode_host=false');
    expect(argv).toContain('shell_environment_policy.inherit="none"');
    expect(argv).not.toContain('OPENAI_API_KEY');
    expect(argv).not.toContain('danger-full-access');
  });
});
