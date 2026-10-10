import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, copyFile, rm, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runtimeExecutable, checkRuntime } from '../src/infrastructure/codex/runtime';

const status = await checkRuntime();
if (!status.available) throw new Error(status.message);
const temporary = await mkdtemp(path.join(os.tmpdir(), 'icegozi-protocol-'));
const destination = path.resolve('src/infrastructure/codex/protocol');
try {
  await promisify(execFile)(await runtimeExecutable(), ['app-server', 'generate-json-schema', '--experimental', '--out', temporary], { windowsHide: true });
  await mkdir(destination, { recursive: true });
  await copyFile(path.join(temporary, 'v1', 'InitializeParams.json'), path.join(destination, 'InitializeParams.json'));
  for (const name of ['DynamicToolCallParams', 'DynamicToolCallResponse', 'CommandExecutionRequestApprovalResponse', 'FileChangeRequestApprovalResponse', 'PermissionsRequestApprovalResponse', 'ExecCommandApprovalResponse', 'ApplyPatchApprovalResponse']) {
    await copyFile(path.join(temporary, name + '.json'), path.join(destination, name + '.json'));
  }
  for (const name of ['ThreadStartParams', 'ThreadResumeParams', 'TurnStartParams', 'TurnCompletedNotification', 'AgentMessageDeltaNotification']) {
    await copyFile(path.join(temporary, 'v2', name + '.json'), path.join(destination, name + '.json'));
  }
} finally {
  const resolved = await realpath(temporary);
  if (path.dirname(resolved).toLowerCase() !== (await realpath(os.tmpdir())).toLowerCase() || !path.basename(resolved).startsWith('icegozi-protocol-')) throw new Error('Unsafe temporary cleanup');
  await rm(resolved, { recursive: true, force: true });
}
