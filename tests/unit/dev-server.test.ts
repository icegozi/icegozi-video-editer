import { afterEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import path from 'node:path';
import { DEV_PROJECT_META, devPort, devProjectId, existingDevServer } from '../../scripts/dev';

const projectRoot = path.resolve('.');
let server: http.Server | undefined;

async function listen(html: string, delayMs = 0): Promise<number> {
  server = http.createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    if (delayMs) setTimeout(() => res.end(html), delayMs);
    else res.end(html);
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return (server.address() as { port: number }).port;
}

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    server = undefined;
  }
});

describe('Dev server startup', () => {
  it('reuses a healthy server belonging to this project', async () => {
    const port = await listen(`<meta name="${DEV_PROJECT_META}" content="${devProjectId(projectRoot)}">`);
    await expect(existingDevServer(projectRoot, port)).resolves.toBe(`http://127.0.0.1:${port}`);
  });

  it('waits for the first page while a cold server prepares it', async () => {
    const port = await listen(`<meta name="${DEV_PROJECT_META}" content="${devProjectId(projectRoot)}">`, 3200);
    await expect(existingDevServer(projectRoot, port)).resolves.toBe(`http://127.0.0.1:${port}`);
  }, 10000);

  it('rejects another application without stopping its server', async () => {
    const port = await listen('<title>Another app</title>');
    await expect(existingDevServer(projectRoot, port)).rejects.toThrow('occupied by another application');
    expect((await fetch(`http://127.0.0.1:${port}`)).status).toBe(200);
  });

  it('rejects a server for another project directory', async () => {
    const port = await listen(`<meta name="${DEV_PROJECT_META}" content="${devProjectId(path.resolve('tests'))}">`);
    await expect(existingDevServer(projectRoot, port)).rejects.toThrow('occupied by another application');
  });

  it('allows startup after a previous server has released its port', async () => {
    const port = await listen('');
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
    await expect(existingDevServer(projectRoot, port)).resolves.toBeNull();
  });

  it('honors the last port override forwarded by npm', () => {
    expect(devPort(['--port', '3200', '--port=3201'])).toBe(3201);
    expect(devPort(['--port', '3200', '--port', '3202'])).toBe(3202);
  });

  it.each(['', 'NaN', '0', '-1', '65536', '3200.5'])('rejects an invalid port: %s', (port) => {
    expect(() => devPort(['--port', port])).toThrow('integer between 1 and 65535');
  });
});
