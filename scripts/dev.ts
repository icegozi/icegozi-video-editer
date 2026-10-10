import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEV_PROJECT_META = 'icegozi-dev-project';

export function devProjectId(projectRoot: string): string {
  const root = realpathSync(projectRoot);
  return createHash('sha256')
    .update(process.platform === 'win32' ? root.toLowerCase() : root)
    .digest('hex');
}

export function devPort(args: string[]): number {
  let value = '3200';
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--port') value = args[++index] ?? '';
    else if (args[index].startsWith('--port=')) value = args[index].slice('--port='.length);
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('The dev server port must be an integer between 1 and 65535.');
  }
  return port;
}

async function portIsOccupied(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') resolve(true);
      else reject(error);
    });
    probe.listen(port, '127.0.0.1', () => {
      probe.close((error) => error ? reject(error) : resolve(false));
    });
  });
}

export async function existingDevServer(projectRoot: string, port: number): Promise<string | null> {
  if (!await portIsOccupied(port)) return null;

  const origin = `http://127.0.0.1:${port}`;
  const marker = `<meta name="${DEV_PROJECT_META}" content="${devProjectId(projectRoot)}">`;
  try {
    const response = await fetch(origin, {
      // The first HTML request can wait for Vite's cold dependency scan on Windows.
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (response.ok && (await response.text()).includes(marker)) return origin;
  } catch {
    // An occupied port with no healthy project response must not be reused.
  }
  throw new Error(
    `Port ${port} is occupied by another application or an unresponsive server. ` +
    `Stop that process, or run npm run dev -- --port ${port === 65535 ? 3201 : port + 1}.`,
  );
}

async function main(): Promise<void> {
  const projectRoot = fileURLToPath(new URL('../', import.meta.url));
  const args = process.argv.slice(2);
  if (!args.some((arg) => ['--help', '-h', '--version', '-v'].includes(arg))) {
    const origin = await existingDevServer(projectRoot, devPort(args));
    if (origin) {
      console.info(`ICEGOZI dev server is already running at ${origin}/`);
      console.info('Use the existing server. To restart it, press Ctrl+C in its terminal first.');
      return;
    }
  }

  // Run Vite in this process so its terminal shortcuts and graceful shutdown stay intact.
  const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  process.argv[1] = viteCli;
  await import(pathToFileURL(viteCli).href);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Unable to start the dev server.');
    process.exitCode = 1;
  });
}
