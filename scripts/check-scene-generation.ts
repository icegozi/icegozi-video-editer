import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-scene-check-'));
process.env.ICEGOZI_APP_ROOT = root;
process.env.ICEGOZI_DATA_DIR = path.join(directory, 'workspace');
process.env.ICEGOZI_DB_PATH = path.join(directory, 'test.sqlite');
process.chdir(root);
const browser = path.join(root, 'runtime', 'browser', 'chrome-headless-shell.exe');
if (fs.existsSync(browser)) process.env.ICEGOZI_BROWSER_EXECUTABLE = browser;
// The checker must use packaged media/runtime binaries, not developer PATH tools.
process.env.PATH = path.join(root, 'runtime');
const { createProductionServer } = await import('../src/infrastructure/server/productionServer');
const { fixtureImageProvider, fixturePng } = await import('../tests/fixtures/generation-fixtures');
const { GoogleOAuthConnection } = await import('../src/infrastructure/scene-generation/googleOAuth');
const { GenerationSecureStore } = await import('../src/infrastructure/scene-generation/secureStore');
const { windowsCredentialEncryption } =
  await import('../src/infrastructure/chatgpt/protectedStorage');
const authDirectory = path.join(directory, 'generation-auth');
const google = new GoogleOAuthConnection(
  new GenerationSecureStore(authDirectory, windowsCredentialEncryption()),
);
const { fakeAssistantAuth } = await import('../tests/fixtures/assistant-fixtures');
const { CoreSceneProvider } = await import('../src/infrastructure/scene-generation/CoreSceneProvider');
const { JsonlClient } = await import('../src/infrastructure/codex/jsonlClient');
const { runtimeExecutable, runtimeArguments } = await import('../src/infrastructure/codex/runtime');
const { createInitialState, editorReducer } = await import('../src/editor/state/editorStore');
const { SnapshotSchema } = await import('../src/application/assistant/assistant.contracts');
const { bundledMediaBinary } = await import('../src/infrastructure/ffmpeg/bundledBinaries');
assert.ok(bundledMediaBinary('ffmpeg'));
assert.ok(bundledMediaBinary('ffprobe'));
const png = path.join(directory, 'fixture.png');
fixturePng(png);
const publicDirectory = path.join(directory, 'workspace', 'public');
fs.mkdirSync(publicDirectory, { recursive: true });
let responses = 0;
const program = [
  'const caps = JSON.parse(await tools.video_editor__get_scene_generation_capabilities({}));',
  'const templates = JSON.parse(await tools.video_editor__list_scene_templates({}));',
  'const skill = JSON.parse(await tools.video_editor__read_video_skill({skillId: "icegozi-scene-generation"}));',
  'const plan = JSON.parse(await tools.video_editor__plan_scene_generation({kind: "video", prompt: "A vector fox bends its head and chews grass", presetId: "core-video-landscape", durationSeconds: 5, templateId: "fox-eating-grass"}));',
  'text(await tools.video_editor__request_scene_generation({planId: plan.id}));',
].join('\n');
const responseServer = http.createServer(async (req, res) => {
  for await (const _chunk of req) {
    /* Only fixture requests reach this local endpoint. */
  }
  responses++;
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  const item =
    responses === 1
      ? {
          type: 'custom_tool_call',
          id: 'ctc_scene',
          call_id: 'call_scene',
          name: 'exec',
          input: program,
        }
      : {
          type: 'message',
          id: 'msg_scene',
          role: 'assistant',
          status: 'completed',
          content: [
            {
              type: 'output_text',
              text: 'Local scene plan awaiting approval.',
              annotations: [],
            },
          ],
        };
  const response = {
    id: `response_scene_${responses}`,
    object: 'response',
    created_at: 0,
    status: 'completed',
    model: 'gpt-6.1-sol',
    output: [item],
    usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 },
  };
  const event = (type: string, value: object) =>
    res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`);
  event('response.created', {
    response: { ...response, status: 'in_progress', output: [] },
  });
  event('response.output_item.added', { output_index: 0, item });
  event('response.output_item.done', { output_index: 0, item });
  event('response.completed', { response });
  res.end();
});
await new Promise<void>((resolve) => responseServer.listen(0, '127.0.0.1', resolve));
const responsePort = (responseServer.address() as { port: number }).port;
const auth = fakeAssistantAuth();
auth.listModels = async () => [{ slug: 'gpt-6.1-sol', displayName: 'Local fixture model' }];
let native: InstanceType<typeof JsonlClient> | undefined;
const server = createProductionServer({
  distDirectory: path.join(root, 'dist'),
  publicDirectory,
  port: 0,
  codex: {
    directory,
    auth,
    google,
    generationProviders: [new CoreSceneProvider(), fixtureImageProvider(png)],
    launch: async () => {
      const executable = await runtimeExecutable();
      const home = path.join(directory, 'native');
      fs.mkdirSync(home, { recursive: true });
      const child = spawn(
        executable,
        [
          ...runtimeArguments(),
          '-c',
          `model_providers.openai_chatgpt_plan.base_url="http://127.0.0.1:${responsePort}/v1"`,
        ],
        {
          cwd: home,
          windowsHide: true,
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            CODEX_HOME: home,
            HOME: home,
            USERPROFILE: home,
            SystemRoot: process.env.SystemRoot,
            TEMP: directory,
            TMP: directory,
            ACCESS_TOKEN: 'synthetic-scene-fixture-only',
          },
        },
      );
      native = new JsonlClient(child);
      await native.initialize();
      return native;
    },
  },
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
try {
  const html = await (await fetch(origin)).text();
  const capability = /name="icegozi-capability" content="([^"]+)"/.exec(html)![1];
  const api = async (route: string, body: unknown) => {
    const response = await fetch(origin + '/api/codex/' + route, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Icegozi-Capability': capability,
      },
      body: JSON.stringify(body),
    });
    const value = await response.json();
    assert.equal(response.status, 200, JSON.stringify(value));
    return value;
  };
  const initial = {
    id: 'packaged-scene-fixture',
    title: 'Packaged scene core',
    width: 320,
    height: 180,
    fps: 6,
    scenes: [
      {
        id: 'before',
        type: 'text' as const,
        title: 'Before',
        durationInFrames: 6,
      },
    ],
  };
  let editor = createInitialState(initial);
  const snapshot = () =>
    SnapshotSchema.parse({
      project: editor.project,
      revision: editor.revision,
      selectedClipId: editor.selectedClipId,
      playhead: editor.currentFrame,
    });
  const view = await api('conversation', snapshot());
  const owner = { conversationId: view.id, epoch: view.epoch };
  editor = editorReducer(editor, {
    type: 'SET_ASSISTANT_SESSION',
    epoch: view.epoch,
  });
  await api('turn', {
    ...owner,
    requestId: crypto.randomUUID(),
    text: 'Create a local vector fox scene, no cloud media.',
    model: 'gpt-6.1-sol',
    snapshot: snapshot(),
  });
  let overview;
  for (let i = 0; i < 600; i++) {
    overview = await api('generation/overview', owner);
    if (overview.requests.length) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(
    overview.requests.length,
    1,
    'Native Code Mode must call the scene tools successfully',
  );
  assert.equal(overview.requests[0].plan.status, 'awaiting_approval');
  assert.equal(overview.requests[0].job, undefined);
  assert.equal(editor.project.scenes.length, 1);
  while ((await api('conversation', snapshot())).status === 'running')
    await new Promise((resolve) => setTimeout(resolve, 50));
  console.info(
    'PASS: real native Code Mode -> core capabilities/template skill -> plan -> pending approval; zero automatic generation/apply.',
  );
  const waitReady = async (requestId: string) => {
    for (let i = 0; i < 480; i++) {
      const value = await api('generation/overview', owner);
      const entry = value.requests.find(
        (request: { requestId: string }) => request.requestId === requestId,
      );
      assert.ok(entry);
      assert.ok(!entry.job?.error, JSON.stringify(entry.job?.error));
      if (entry.job?.status === 'ready') return entry;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('Scene did not become ready');
  };
  const requestId = overview.requests[0].requestId;
  await api('generation/approve', { ...owner, requestId, accept: true });
  const core = await waitReady(requestId);
  assert.equal(core.asset.mediaType, 'video');
  assert.equal(core.asset.metadata.width, 1280);
  assert.ok(core.asset.metadata.durationInSeconds >= 4.9);
  const apply = async (entry: { requestId: string; asset: { id: string } }) => {
    const proposal = await api('generation/propose', {
      ...owner,
      requestId: entry.requestId,
      assetId: entry.asset.id,
      snapshot: snapshot(),
    });
    const attemptId = crypto.randomUUID();
    const reserved = await api('proposal/reserve', {
      ...owner,
      proposalId: proposal.id,
      attemptId,
      snapshot: snapshot(),
    });
    editor = editorReducer(editor, {
      type: 'SET_ASSET_MANIFEST',
      projectId: editor.project.id,
      epoch: owner.epoch,
      assets: reserved.assets,
    });
    editor = editorReducer(editor, {
      type: 'APPLY_AI_PROJECT_CHANGE',
      proposal: reserved.proposal,
      lease: reserved.lease,
    });
    assert.equal(editor.assistantApplyError, null);
    await api('proposal/ack', {
      ...owner,
      proposalId: proposal.id,
      attemptId,
      applied: true,
    });
  };
  await apply(core);
  assert.equal(editor.project.scenes.length, 2);
  editor = editorReducer(editor, { type: 'UNDO' });
  assert.equal(editor.project.scenes.length, 1);
  editor = editorReducer(editor, { type: 'REDO' });
  assert.equal(editor.project.scenes.length, 2);
  const key = 'AQ.fixture_only_not_a_real_key_000001';
  const keyStatus = await api('generation/google/configure', {
    ...owner,
    config: { mode: 'api_key', apiKey: key },
  });
  assert.equal(keyStatus.authMode, 'api_key');
  assert.equal(keyStatus.configured, true);
  assert.ok(!JSON.stringify(keyStatus).includes(key));
  const reopenedGoogle = new GoogleOAuthConnection(
    new GenerationSecureStore(authDirectory, windowsCredentialEncryption()),
  );
  const profileId = (await auth.getSession()).profileId!;
  assert.equal(
    (await reopenedGoogle.credential(profileId, keyStatus.connection.version)).apiKey,
    key,
  );
  for (const file of fs.readdirSync(authDirectory))
    if (file.endsWith('.enc'))
      assert.ok(!fs.readFileSync(path.join(authDirectory, file), 'utf8').includes(key));
  console.info(
    'PASS: production bridge API-key configuration -> real Windows DPAPI -> restored credential; no key in public status or plaintext files. No Google request.',
  );
  const imagePlan = await api('generation/plan', {
    ...owner,
    snapshot: snapshot(),
    request: {
      kind: 'image',
      presetId: 'gemini-image-landscape',
      prompt: 'Fixture fox image; no live Gemini',
    },
  });
  await api('generation/request', { ...owner, planId: imagePlan.id });
  await api('generation/approve', {
    ...owner,
    requestId: imagePlan.id,
    accept: true,
  });
  const image = await waitReady(imagePlan.id);
  await apply(image);
  assert.equal(editor.project.scenes.length, 3);
  const render = await api('render', {
    ...owner,
    requestId: crypto.randomUUID(),
    snapshot: snapshot(),
  });
  let output;
  for (let i = 0; i < 480; i++) {
    const status = await api('render/status', { ...owner, jobId: render.id });
    assert.notEqual(status.status, 'failed');
    if (status.downloadUrl) {
      output = await fetch(origin + status.downloadUrl + '?' + new URLSearchParams(owner), {
        headers: { 'X-Icegozi-Capability': capability },
      });
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(output?.ok);
  assert.ok((await output.arrayBuffer()).byteLength > 1000);
  const { FfprobeClient } = await import('../src/infrastructure/ffmpeg/FfprobeClient');
  const corePath = path.join(publicDirectory, core.asset.storageKey);
  const metadata = await FfprobeClient.probe(corePath);
  assert.ok(metadata.durationInSeconds >= 4.9);
  const evidence = path.join(root, 'build', 'evidence', 'scene-generation');
  fs.mkdirSync(evidence, { recursive: true });
  fs.copyFileSync(corePath, path.join(evidence, 'fox-core.mp4'));
  assert.equal(responses, 2);
  console.info(
    'PASS: core real MP4 + fake Gemini image -> durable assets -> proposal reserve/ack -> apply/undo/redo -> project MP4; bundled binaries, no Vite/global FFmpeg or live API calls.',
  );
} finally {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await native?.stop();
  responseServer.closeAllConnections();
  await new Promise<void>((resolve) => responseServer.close(() => resolve()));
  const { closeDatabase } = await import('../src/infrastructure/db/client');
  closeDatabase();
  const actual = fs.realpathSync(directory);
  assert.equal(path.dirname(actual).toLowerCase(), fs.realpathSync(os.tmpdir()).toLowerCase());
  assert.ok(path.basename(actual).startsWith('icegozi-scene-check-'));
  fs.rmSync(actual, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
}
