import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, execFile } from 'node:child_process';
import type { SceneGenerationProvider } from '../../application/scene-generation/SceneGenerationProvider';
import type { GenerationPlan } from '../../application/scene-generation/generation.contracts';
import { PATHS } from '../../config/paths.config';
import { AssistantError } from '../../application/assistant/errors';

export class CoreSceneProvider implements SceneGenerationProvider {
  id = 'core';
  async generate(
    plan: GenerationPlan,
    output: string,
    _reference: unknown,
    signal: AbortSignal,
    progress: (percent: number) => void,
  ): Promise<{ mimeType: string }> {
    if (!plan.request.sceneSpec)
      throw new AssistantError(
        'scene_spec_missing',
        'Core cần dữ liệu cảnh hoặc một mẫu dựng cảnh.',
      );
    const props = path.join(path.dirname(output), 'props.json');
    fs.writeFileSync(
      props,
      JSON.stringify({
        sceneSpec: plan.request.sceneSpec,
        width: plan.preset.width,
        height: plan.preset.height,
        fps: plan.fps,
        durationInFrames: Math.max(1, Math.round((plan.request.durationSeconds ?? 1) * plan.fps)),
      }),
      { flag: 'wx' },
    );
    const require = createRequire(import.meta.url);
    const cli = path.join(
      path.dirname(require.resolve('@remotion/cli/package.json')),
      'remotion-cli.js',
    );
    const video = plan.request.kind === 'video';
    const args = [
      cli,
      video ? 'render' : 'still',
      'src/generation/index.tsx',
      'GeneratedScene',
      output,
      `--props=${props}`,
      ...(video ? ['--codec=h264', '--pixel-format=yuv420p', '--crf=23'] : ['--image-format=png']),
      '--gl=angle',
      '--concurrency=2',
      ...(process.env.ICEGOZI_BROWSER_EXECUTABLE
        ? [`--browser-executable=${process.env.ICEGOZI_BROWSER_EXECUTABLE}`]
        : []),
    ];
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, args, {
          cwd: PATHS.root,
          windowsHide: true,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
            HOME: process.env.HOME,
            USERPROFILE: process.env.USERPROFILE,
            LOCALAPPDATA: process.env.LOCALAPPDATA,
          },
        });
        const stop = () => {
          if (process.platform === 'win32' && child.pid)
            execFile(
              path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'),
              ['/PID', String(child.pid), '/T', '/F'],
              { windowsHide: true },
              () => {},
            );
          else child.kill('SIGTERM');
        };
        const timer = setTimeout(stop, 10 * 60_000);
        signal.addEventListener('abort', stop, { once: true });
        if (signal.aborted) stop();
        child.stdout.on('data', (chunk: Buffer) => {
          const match = /(\d+)%/.exec(chunk.toString());
          if (match) progress(Math.min(95, Number(match[1])));
        });
        child.stderr.on('data', () => {});
        child.once('error', () => {
          clearTimeout(timer);
          signal.removeEventListener('abort', stop);
          reject(new AssistantError('core_start_failed', 'Không khởi động được core dựng cảnh.'));
        });
        child.once('close', (code) => {
          clearTimeout(timer);
          signal.removeEventListener('abort', stop);
          if (signal.aborted) reject(new AssistantError('cancelled', 'Đã dừng dựng cảnh.'));
          else if (code === 0) resolve();
          else
            reject(
              new AssistantError(
                'core_render_failed',
                'Core chưa dựng được cảnh. Kiểm tra bộ runtime được đóng gói.',
              ),
            );
        });
      });
      return { mimeType: video ? 'video/mp4' : 'image/png' };
    } finally {
      if (fs.existsSync(props)) fs.unlinkSync(props);
    }
  }
}
