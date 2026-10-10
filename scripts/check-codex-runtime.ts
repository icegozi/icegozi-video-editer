import { mkdtemp, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { startRuntime, checkRuntime } from '../src/infrastructure/codex/runtime';
import { videoTools } from '../src/application/assistant/assistantService';

const directory = await mkdtemp(path.join(os.tmpdir(), 'icegozi-runtime-check-'));
let client: Awaited<ReturnType<typeof startRuntime>> | undefined;
try {
  assert.equal((await checkRuntime()).available, true);
  client = await startRuntime('synthetic-no-inference-credential', directory);
  console.info('Native runtime initialized');
  const result = await client.request('thread/start', {
    cwd: directory, sandbox: 'read-only', approvalPolicy: 'on-request', environments: [],
    selectedCapabilityRoots: [], dynamicTools: videoTools,
  }) as { thread: { id: string } };
  assert.ok(result.thread.id);
  console.info('Native thread created with namespace tools and no machine environments');
  await client.stop();
  client = await startRuntime('synthetic-no-inference-credential', directory);
  console.info('PASS: native 0.160.1 initialize/thread/start/namespace tools/empty environments and orderly restart. Resume after real inference, account entitlement and real OAuth are NOT VERIFIED.');
} finally {
  await client?.stop();
  const resolved = await realpath(directory);
  assert.equal(path.dirname(resolved).toLowerCase(), (await realpath(os.tmpdir())).toLowerCase());
  assert.ok(path.basename(resolved).startsWith('icegozi-runtime-check-'));
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
