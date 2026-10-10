import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { renderApiPlugin } from '../../src/infrastructure/server/renderApiPlugin';
import { mockProject } from '../fixtures/mock-project';

describe('Local API Boundaries, UTF-8 Chunks & Size Limits (I14 / T18)', () => {
  let server: http.Server;
  let serverPort: number;

  beforeEach(async () => {
    const plugin = renderApiPlugin();
    server = http.createServer();

    const mockViteServer = {
      config: { server: { port: 0 } },
      middlewares: {
        use: (fn: any) => {
          server.on('request', fn);
        },
      },
    };

    (plugin as any).configureServer(mockViteServer);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        mockViteServer.config.server.port = serverPort;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('correctly reassembles Vietnamese multibyte UTF-8 characters split across chunk boundaries (T18)', async () => {
    const complexVietnameseTitle = 'Dự án biên tập video chuyên nghiệp: Xin chào thế giới — Tiếng Việt có dấu 🚀';
    const payload = JSON.stringify({
      project: {
        ...mockProject,
        id: 'proj-vietnamese-utf8-chunk',
        title: complexVietnameseTitle,
      },
    });

    const fullBuffer = Buffer.from(payload, 'utf8');

    // Find a multibyte byte boundary (e.g. at the character 'ệ' or 'ế') to deliberately split across chunks
    // In UTF-8, characters like 'ệ' (0xE1 0xBB 0x87) are 3 bytes.
    // We split right in the middle of the buffer
    const mid = Math.floor(fullBuffer.length / 2);
    const chunk1 = fullBuffer.subarray(0, mid);
    const chunk2 = fullBuffer.subarray(mid);

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: serverPort,
          path: '/api/projects',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Host: `127.0.0.1:${serverPort}`,
            'Transfer-Encoding': 'chunked',
          },
        },
        resolve
      );
      req.on('error', reject);
      req.write(chunk1);
      setTimeout(() => {
        req.write(chunk2);
        req.end();
      }, 20);
    });

    expect(response.statusCode).toBe(200);
    const chunks: Buffer[] = [];
    for await (const c of response) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    expect(body.success).toBe(true);

    // Retrieve and verify title did not get corrupted
    const getRes = await fetch(`http://127.0.0.1:${serverPort}/api/projects/proj-vietnamese-utf8-chunk`, {
      headers: { Host: `127.0.0.1:${serverPort}` },
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.project.title).toBe(complexVietnameseTitle);
  });

  it('rejects oversized JSON payload exceeding 1MB limit with HTTP 413 (T18)', async () => {
    // Generate 1.2 MB JSON string
    const largeTitle = 'A'.repeat(1.2 * 1024 * 1024);
    const payload = JSON.stringify({ project: { ...mockProject, title: largeTitle } });

    const res = await fetch(`http://127.0.0.1:${serverPort}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: `127.0.0.1:${serverPort}`,
      },
      body: payload,
    });

    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('limit');
  });

  it('rejects non-JSON Content-Type with HTTP 415', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Host: `127.0.0.1:${serverPort}`,
      },
      body: 'plain text not json',
    });

    expect(res.status).toBe(415);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Content-Type must be application/json');
  });

  it('rejects cross-site origin headers with HTTP 403', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/projects`, {
      method: 'GET',
      headers: {
        Host: `127.0.0.1:${serverPort}`,
        Origin: 'https://malicious-external-site.com',
      },
    });

    expect(res.status).toBe(403);
  });
});
