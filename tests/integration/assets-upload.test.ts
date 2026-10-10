import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PATHS } from '../../src/config/paths.config';
import { renderApiPlugin } from '../../src/infrastructure/server/renderApiPlugin';

describe('Assets Upload Safety & Concurrency (C1 & I14 / T1 & T2)', () => {
  let server: http.Server;
  let serverPort: number;
  let createdFiles: string[] = [];

  beforeEach(async () => {
    const plugin = renderApiPlugin();
    server = http.createServer();

    // Mock minimal Vite server configureServer hook
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
    for (const f of createdFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }
    createdFiles = [];
  });

  it('assigns unique non-colliding storage keys for uploads with identical original filename, preserving source content (C1 / T1)', async () => {
    const originalFilename = 'video_demo_tiếng_việt_🎬.mp4';
    const firstContent = Buffer.from('ORIGINAL_SOURCE_CONTENT_V1_HASH_123456');
    const firstHash = createHash('sha256').update(firstContent).digest('hex');

    const secondContent = Buffer.from('SECOND_UPLOAD_CONTENT_V2_HASH_987654');
    const secondHash = createHash('sha256').update(secondContent).digest('hex');

    // 1. Upload first file
    const res1 = await fetch(`http://127.0.0.1:${serverPort}/api/assets/upload`, {
      method: 'POST',
      headers: {
        'x-file-name': encodeURIComponent(originalFilename),
        Host: `127.0.0.1:${serverPort}`,
      },
      body: firstContent,
    });

    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    expect(data1.filename).toBeDefined();
    expect(data1.path).toBeDefined();
    createdFiles.push(data1.path);

    // Verify first file on disk
    expect(fs.existsSync(data1.path)).toBe(true);
    const onDisk1 = fs.readFileSync(data1.path);
    expect(createHash('sha256').update(onDisk1).digest('hex')).toBe(firstHash);

    // 2. Upload second file with the exact same original filename
    const res2 = await fetch(`http://127.0.0.1:${serverPort}/api/assets/upload`, {
      method: 'POST',
      headers: {
        'x-file-name': encodeURIComponent(originalFilename),
        Host: `127.0.0.1:${serverPort}`,
      },
      body: secondContent,
    });

    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.success).toBe(true);
    expect(data2.filename).toBeDefined();
    expect(data2.path).toBeDefined();
    createdFiles.push(data2.path);

    // CRITICAL C1 GUARANTEES:
    // Different storage keys / filenames
    expect(data1.filename).not.toBe(data2.filename);
    expect(data1.path).not.toBe(data2.path);

    // First file remains untouched and uncorrupted!
    const firstFileAfterSecondUpload = fs.readFileSync(data1.path);
    expect(createHash('sha256').update(firstFileAfterSecondUpload).digest('hex')).toBe(firstHash);

    // Second file has its own content
    const secondFileOnDisk = fs.readFileSync(data2.path);
    expect(createHash('sha256').update(secondFileOnDisk).digest('hex')).toBe(secondHash);
  });

  it('handles simultaneous concurrent uploads of the same filename without collision', async () => {
    const filename = 'concurrent_test.mp4';
    const payload1 = Buffer.from('ORIGINAL_CONCURRENT_FILE_1');
    const payload2 = Buffer.from('SECOND_CONCURRENT_FILE_2');

    const [res1, res2] = await Promise.all([
      fetch(`http://127.0.0.1:${serverPort}/api/assets/upload`, {
        method: 'POST',
        headers: { 'x-file-name': filename, Host: `127.0.0.1:${serverPort}` },
        body: payload1,
      }),
      fetch(`http://127.0.0.1:${serverPort}/api/assets/upload`, {
        method: 'POST',
        headers: { 'x-file-name': filename, Host: `127.0.0.1:${serverPort}` },
        body: payload2,
      }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.filename).not.toBe(data2.filename);
    createdFiles.push(data1.path, data2.path);

    expect(fs.existsSync(data1.path)).toBe(true);
    expect(fs.existsSync(data2.path)).toBe(true);
  });

  it('rejects unsupported file extensions with 415 (C1 & I14 / T2)', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/assets/upload`, {
      method: 'POST',
      headers: {
        'x-file-name': 'malicious.exe',
        Host: `127.0.0.1:${serverPort}`,
      },
      body: Buffer.from('MZ_EXECUTABLE_BINARY_DATA'),
    });

    expect(res.status).toBe(415);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unsupported file type');
  });

  it('cleans up temporary file and leaves no partial asset when upload is aborted prematurely (T2)', async () => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/assets/upload',
      method: 'POST',
      headers: {
        'x-file-name': 'aborted_stream.mp4',
        Host: `127.0.0.1:${serverPort}`,
      },
    });
    req.on('error', () => {}); // Expected ECONNRESET on manual client destroy

    req.write(Buffer.from('ORIGINAL_CHUNK_1'));
    // Abort socket connection before finishing
    req.destroy();

    // Give server tick to detect abort and cleanup temp file
    await new Promise((r) => setTimeout(r, 100));

    // Ensure no partial file is promoted in public video directory
    const publicVideos = fs.readdirSync(PATHS.publicVideo);
    expect(publicVideos.some((f) => f.includes('aborted_stream'))).toBe(false);
  });
});
