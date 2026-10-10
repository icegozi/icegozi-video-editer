import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { createProductionServer } from '../../src/infrastructure/server/productionServer';
import { fakeAssistantAuth, fakeAssistantRuntime } from '../fixtures/assistant-fixtures';
import { mockProject } from '../fixtures/mock-project';

let server: http.Server;
let directory: string;
let origin: string;
let capability: string;
let runtime: Awaited<ReturnType<typeof fakeAssistantRuntime>>;

beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-production-test-'));
  const dist = path.join(directory, 'dist');
  const publicDirectory = path.join(directory, 'public');
  fs.mkdirSync(dist);
  fs.mkdirSync(path.join(publicDirectory, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<html><head></head><body>Production editor</body></html>');
  fs.writeFileSync(path.join(dist, 'editor.js'), 'export const editor = true;');
  fs.writeFileSync(path.join(publicDirectory, 'assets', 'clip.mp4'), '0123456789');
  fs.writeFileSync(path.join(directory, '.env'), 'synthetic-do-not-serve');
  runtime = await fakeAssistantRuntime();
  server = createProductionServer({ distDirectory: dist, publicDirectory, port: 0,
    codex: { auth: fakeAssistantAuth(), directory: path.join(directory, 'assistant'), launch: async () => runtime.rpc } });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const html = await (await fetch(origin)).text();
  capability = /name="icegozi-capability" content="([^"]+)"/.exec(html)![1];
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await runtime.rpc.stop();
  const resolved = fs.realpathSync(directory);
  expect(path.dirname(resolved).toLowerCase()).toBe(fs.realpathSync(os.tmpdir()).toLowerCase());
  expect(path.basename(resolved)).toMatch(/^icegozi-production-test-/);
  fs.rmSync(resolved, { recursive: true, force: true });
});

const post = async (route: string, body: unknown) => {
  const response = await fetch(origin + '/api/codex/' + route, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Icegozi-Capability': capability }, body: JSON.stringify(body) });
  expect(response.status).toBe(200);
  return response.json();
};

describe('Packaged local backend', () => {
  it('bootstraps the protected bridge from built HTML and serves JavaScript without Vite', async () => {
    const response = await fetch(origin + '/editor.js');
    expect(response.headers.get('content-type')).toContain('text/javascript');
    expect(await response.text()).toContain('editor = true');
    const status = await fetch(origin + '/api/codex/status', { headers: { 'X-Icegozi-Capability': capability } });
    expect(status.status).toBe(200);
    expect((await status.json()).auth.status).toBe('connected');
  });

  it('rejects missing capability and cross-site requests', async () => {
    expect((await fetch(origin + '/api/codex/status')).status).toBe(403);
    expect((await fetch(origin, { headers: { Origin: 'https://outside.invalid' } })).status).toBe(403);
    const invalidHost = await new Promise<number>((resolve, reject) => {
      http.get(origin, { headers: { Host: 'outside.invalid' } }, (response) => {
        response.resume(); resolve(response.statusCode!);
      }).on('error', reject);
    });
    expect(invalidHost).toBe(403);
  });

  it('serves byte ranges and HEAD for local video playback', async () => {
    const response = await fetch(origin + '/assets/clip.mp4', { headers: { Range: 'bytes=2-5' } });
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 2-5/10');
    expect(await response.text()).toBe('2345');
    expect((await fetch(origin + '/assets/clip.mp4', { headers: { Range: 'bytes=30-' } })).status).toBe(416);
    const head = await fetch(origin + '/assets/clip.mp4', { method: 'HEAD' });
    expect(head.headers.get('content-length')).toBe('10');
    expect(await head.text()).toBe('');
  });

  it('keeps private files and unknown API routes out of static responses', async () => {
    for (const route of ['/.env', '/%2e%2e%5c.env', '/api/missing', '/@fs/secret']) {
      const response = await fetch(origin + route);
      expect([400, 404]).toContain(response.status);
      expect(await response.text()).not.toContain('synthetic-do-not-serve');
    }
  });

  it('creates a draft through the same tool bridge used by the packaged app', async () => {
    const snapshot = { project: structuredClone(mockProject), revision: 1, selectedClipId: 'scene-1', playhead: 0 };
    const view = await post('conversation', snapshot);
    await post('turn', { conversationId: view.id, epoch: view.epoch, requestId: randomUUID(),
      text: 'Create a fixture draft', model: 'fixture-model', snapshot });
    runtime.notify({ id: 900, method: 'item/tool/call', params: { threadId: 'fixture-thread',
      turnId: 'fixture-turn-1', namespace: 'video_editor', tool: 'propose_project_change', callId: 'packaged-draft',
      arguments: { summary: 'Packaged fixture draft', candidate: { ...mockProject, title: 'Packaged draft' } } } });
    await vi.waitFor(async () => {
      const updated = await post('conversation', snapshot);
      expect(updated.proposals).toHaveLength(1);
      expect(updated.proposals[0].candidate.title).toBe('Packaged draft');
    });
  });
});
