import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonlClient } from '../src/infrastructure/codex/jsonlClient';
import { runtimeArguments, runtimeExecutable } from '../src/infrastructure/codex/runtime';
import { AssistantService } from '../src/application/assistant/assistantService';
import { fakeAssistantAuth } from '../tests/fixtures/assistant-fixtures';

const directory = await mkdtemp(path.join(os.tmpdir(), 'icegozi-code-mode-'));
let client: JsonlClient | undefined;
let requests = 0;
let service: AssistantService | undefined;
const program = [
  'const capabilities = JSON.parse(await tools.video_editor__get_editor_capabilities({}));',
  'const skill = JSON.parse(await tools.video_editor__read_video_skill({skillId: "icegozi-text-motion"}));',
  'const context = JSON.parse(await tools.video_editor__get_project_context({}));',
  'const candidate = {...context.project, scenes: [{id: "title-a", type: "text", title: "A", durationInFrames: 150, animationType: "scale", fontSize: 72, startScale: 0.25, endScale: 1.5, backgroundColor: "#000000", textColor: "#FFFFFF"}]};',
  'const validation = JSON.parse(await tools.video_editor__validate_project_change({candidate}));',
  'if (!validation.valid) throw new Error(JSON.stringify(validation.errors));',
  'text(await tools.video_editor__propose_project_change({summary: "Synthetic A grows over five seconds", candidate}));',
].join('\n');
const server = http.createServer(async (req, res) => {
  for await (const _chunk of req) { /* Consume only synthetic request data. */ }
  requests++;
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  const item = requests === 1
    ? { type: 'custom_tool_call', id: 'ctc_fixture', call_id: 'call_fixture', name: 'exec',
      input: program }
    : { type: 'message', id: 'msg_fixture', role: 'assistant', status: 'completed',
      content: [{ type: 'output_text', text: 'Native fixture tool completed.', annotations: [] }] };
  const response = { id: `resp_fixture_${requests}`, object: 'response', created_at: 0,
    status: 'completed', model: 'gpt-6.1-sol', output: [item],
    usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 } };
  const send = (type: string, data: object) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  send('response.created', { response: { ...response, status: 'in_progress', output: [] } });
  send('response.output_item.added', { output_index: 0, item });
  send('response.output_item.done', { output_index: 0, item });
  send('response.completed', { response });
  res.end();
});

try {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const executable = await runtimeExecutable();
  const auth = fakeAssistantAuth();
  auth.listModels = async () => [{ slug: 'gpt-6.1-sol', displayName: 'Synthetic local model' }];
  let rendered = false;
  service = new AssistantService(auth, { create: () => { rendered = true; return { id: 'not-expected' }; }, status: () => null, cancel: () => true }, directory, async () => {
    const child = spawn(executable, [...runtimeArguments(), '-c',
      `model_providers.openai_chatgpt_plan.base_url="http://127.0.0.1:${port}/v1"`], {
      cwd: directory, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env: { CODEX_HOME: directory, HOME: directory, USERPROFILE: directory, SystemRoot: process.env.SystemRoot,
        TEMP: directory, TMP: directory, ACCESS_TOKEN: 'synthetic-local-fixture-only' },
    });
    client = new JsonlClient(child);
    await client.initialize();
    return client;
  });
  const snapshot = { project: { id: 'native-skills-fixture', title: 'Native skills fixture', width: 320, height: 180, fps: 30,
    scenes: [{ id: 'title-original', type: 'text' as const, title: 'Before', durationInFrames: 150 }], audioTracks: [] },
    revision: 1, playhead: 0, selectedClipId: 'title-original' };
  const view = await service.open(snapshot);
  await service.send(view.id, view.epoch, 'synthetic-request', 'Create a five-second A growing from small to large. Synthetic local response only.', 'gpt-6.1-sol', snapshot);
  const deadline = Date.now() + 30000;
  let result = await service.open(snapshot);
  while (result.status === 'running' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    result = await service.open(snapshot);
  }
  assert.equal(result.status, 'completed', result.error ?? 'Native Code Mode skill fixture timed out');
  assert.equal(result.proposals.length, 1, 'The actual app dispatcher must create a validated draft');
  const scene = result.proposals[0].candidate.scenes[0];
  assert.equal(scene.type, 'text');
  if (scene.type === 'text') { assert.equal(scene.animationType, 'scale'); assert.equal(scene.endScale, 1.5); }
  assert.equal(rendered, false, 'A draft must not render or apply itself without user review');
  assert.equal(requests, 2);
  console.info('PASS: native exec -> capabilities -> bundled skill -> project -> validation -> A scale draft. Local synthetic Responses; no auto-apply/render.');
} finally {
  service?.dispose();
  await client?.stop();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const resolved = await realpath(directory);
  assert.equal(path.dirname(resolved).toLowerCase(), (await realpath(os.tmpdir())).toLowerCase());
  assert.ok(path.basename(resolved).startsWith('icegozi-code-mode-'));
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
