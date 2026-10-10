import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { ChatGPTClient, SessionState } from '../../src/infrastructure/chatgpt/devkit/types';
import { JsonlClient, type RpcMessage } from '../../src/infrastructure/codex/jsonlClient';

export function fakeAssistantAuth(): ChatGPTClient {
  let state: SessionState = { status: 'connected', sharing: true, profileId: 'fixture-profile', profileLabel: 'Fixture only', identity: { email: 'fixture@example.invalid' } };
  return {
    getSession: async () => structuredClone(state),
    getRuntimeCredential: async () => ({ accessToken: 'synthetic-fixture-token', profileId: state.profileId! }),
    listProfiles: async () => [{ id: 'fixture-profile', label: 'Fixture only', status: state.status, sharing: state.sharing }],
    listModels: async () => [{ slug: 'fixture-model', displayName: 'Fixture model (no inference)' }],
    signIn: async () => { state = { ...state, status: 'connected', sharing: true }; return state; },
    cancelSignIn: () => undefined,
    disconnect: async () => { state = { ...state, status: 'disconnected', sharing: false }; },
    selectProfile: async () => state,
    subscribe: () => () => undefined,
    streamResponse: async () => { throw new Error('Direct inference is forbidden in tests'); },
  };
}

export async function fakeAssistantRuntime(options: { rejectResume?: boolean } = {}) {
  const emitter = new EventEmitter();
  const process = Object.assign(emitter, { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), killed: false,
    kill() { this.killed = true; queueMicrotask(() => emitter.emit('close', 0)); return true; },
  });
  const rpc = new JsonlClient(process as unknown as ChildProcessWithoutNullStreams);
  const requests: RpcMessage[] = [];
  const notify = (message: RpcMessage) => process.stdout.write(JSON.stringify(message) + '\n');
  let turn = 0;
  process.stdin.on('data', (chunk: Buffer) => {
    const message = JSON.parse(chunk.toString()) as RpcMessage;
    requests.push(message);
    if (!message.method || message.id === undefined) return;
    if (message.method === 'thread/resume' && options.rejectResume) { notify({ id: message.id, error: { code: -32602, message: 'Synthetic missing thread' } }); return; }
    let result: unknown = {};
    if (message.method === 'thread/start' || message.method === 'thread/resume') result = { thread: { id: 'fixture-thread' } };
    if (message.method === 'turn/start') result = { turn: { id: `fixture-turn-${++turn}` } };
    notify({ id: message.id, result });
  });
  await rpc.initialize();
  return { rpc, process, requests, notify };
}
