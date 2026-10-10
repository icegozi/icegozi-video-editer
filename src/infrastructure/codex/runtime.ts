import { spawn, execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, realpath, readFile } from 'node:fs/promises';
import path from 'node:path';
import { JsonlClient } from './jsonlClient';
import { AssistantError } from '../../application/assistant/errors';

export const CODEX_VERSION = '0.160.1';
const require = createRequire(import.meta.url);

export async function runtimeExecutable(): Promise<string> {
  const targets: Record<string, string> = {
    'win32-x64': 'x86_64-pc-windows-msvc', 'win32-arm64': 'aarch64-pc-windows-msvc',
    'linux-x64': 'x86_64-unknown-linux-musl', 'linux-arm64': 'aarch64-unknown-linux-musl',
    'darwin-x64': 'x86_64-apple-darwin', 'darwin-arm64': 'aarch64-apple-darwin',
  };
  const target = targets[`${process.platform}-${process.arch}`];
  if (!target) throw new AssistantError('runtime_missing', 'Nền tảng chưa hỗ trợ runtime này.');
  const manifest = require.resolve(`@openai/codex-${process.platform}-${process.arch}/package.json`);
  const info = JSON.parse(await readFile(manifest, 'utf8')) as { version: string };
  if (info.version !== `${CODEX_VERSION}-${process.platform}-${process.arch}`) throw new AssistantError('runtime_version', 'Runtime không đúng phiên bản. Chạy npm ci.');
  return realpath(path.join(path.dirname(manifest), 'vendor', target, 'bin', process.platform === 'win32' ? 'codex.exe' : 'codex'));
}

export async function checkRuntime(): Promise<{ available: boolean; version: string; message: string }> {
  try {
    const executable = await runtimeExecutable();
    const version = await new Promise<string>((resolve, reject) => {
      execFile(executable, ['--version'], { timeout: 5000, windowsHide: true, maxBuffer: 4096 }, (error, stdout) => error ? reject(error) : resolve(stdout.trim()));
    });
    if (version !== `codex-cli ${CODEX_VERSION}`) throw new Error('Incompatible runtime');
    return { available: true, version: CODEX_VERSION, message: 'Chỉ dùng công cụ video cho phép; dynamic tools đang thử nghiệm.' };
  } catch {
    return { available: false, version: CODEX_VERSION, message: 'Runtime thiếu/không tương thích. Chạy npm ci rồi mở lại app.' };
  }
}

export function runtimeArguments(): string[] {
  const config = [
    'model_provider="openai_chatgpt_plan"',
    'model_providers.openai_chatgpt_plan.name="ChatGPT plan"',
    'model_providers.openai_chatgpt_plan.base_url="https://api.openai.com/v1"',
    'model_providers.openai_chatgpt_plan.env_key="ACCESS_TOKEN"',
    'model_providers.openai_chatgpt_plan.wire_api="responses"',
    'model_providers.openai_chatgpt_plan.requires_openai_auth=false',
    'model_providers.openai_chatgpt_plan.supports_websockets=false',
    'web_search="disabled"', 'approval_policy="on-request"', 'sandbox_mode="read-only"',
    'shell_environment_policy.inherit="none"', 'shell_environment_policy.exclude=["*"]',
    ...['shell_tool', 'unified_exec', 'view_image', 'multi_agent', 'multi_agent_v2', 'code_mode', 'code_mode_host', 'apps', 'plugins', 'browser_use', 'computer_use', 'image_generation', 'memories', 'hooks', 'skill_search', 'skill_mcp_dependency_install', 'workspace_dependencies', 'tool_suggest', 'goals'].map((feature) => `features.${feature}=false`),
  ];
  return ['app-server', '--listen', 'stdio://', ...config.flatMap((value) => ['-c', value])];
}

export async function startRuntime(accessToken: string, directory: string): Promise<JsonlClient> {
  const executable = await runtimeExecutable();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const safeDirectory = await realpath(directory);
  if (path.resolve(safeDirectory).toLowerCase() !== path.resolve(directory).toLowerCase()) throw new AssistantError('workspace_unsafe', 'Workspace runtime không được là symlink/junction.');
  const child = spawn(executable, runtimeArguments(), {
    cwd: safeDirectory, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    env: { CODEX_HOME: safeDirectory, HOME: safeDirectory, USERPROFILE: safeDirectory,
      SystemRoot: process.env.SystemRoot, TEMP: safeDirectory, TMP: safeDirectory, ACCESS_TOKEN: accessToken },
  });
  const client = new JsonlClient(child);
  try { await client.initialize(); return client; }
  catch (error) { client.dispose(); throw error; }
}
