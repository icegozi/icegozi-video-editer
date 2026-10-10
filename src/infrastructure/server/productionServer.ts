import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createCodexBridge, type CodexPluginOptions } from './codexApiPlugin';
import { createRenderApi } from './renderApiPlugin';
import type { LocalApiServer, LocalMiddleware } from './localApiServer';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon',
};

function containedFile(directory: string, pathname: string): string | null {
  const root = fs.realpathSync(directory);
  const candidate = path.resolve(root, '.' + pathname);
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(candidate)) return null;
  const resolved = fs.realpathSync(candidate);
  const realRelative = path.relative(root, resolved);
  if (realRelative.startsWith('..') || path.isAbsolute(realRelative) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}

export function createProductionServer(options: {
  distDirectory: string;
  publicDirectory: string;
  port: number;
  codex?: CodexPluginOptions;
}): http.Server {
  const index = fs.readFileSync(path.join(options.distDirectory, 'index.html'), 'utf8');
  const middleware: LocalMiddleware[] = [];
  const server = http.createServer((req, res) => {
    let position = 0;
    const next = () => {
      if (res.writableEnded || res.destroyed) return;
      const handler = middleware[position++];
      if (!handler) { res.writeHead(404); res.end('Not found'); return; }
      try {
        Promise.resolve(handler(req, res, next)).catch(() => {
          if (res.headersSent) res.destroy();
          else { res.writeHead(500); res.end('Local request failed'); }
        });
      } catch {
        if (res.headersSent) res.destroy();
        else { res.writeHead(500); res.end('Local request failed'); }
      }
    };
    next();
  });
  const context: LocalApiServer = { httpServer: server, config: { server: { port: options.port } },
    middlewares: { use(handler) { middleware.push(handler); } } };
  const bridge = createCodexBridge(options.codex);
  bridge.configureServer(context);
  createRenderApi().configureServer(context);
  const html = index.replace('</head>', `<meta name="icegozi-capability" content="${bridge.capability}"></head>`);
  middleware.push((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { next(); return; }
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname); }
    catch { res.writeHead(400); res.end('Invalid URL'); return; }
    if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) {
      res.writeHead(400); res.end('Invalid path'); return;
    }
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': contentTypes['.html'], 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : html);
      return;
    }
    if (pathname.startsWith('/api/')) { next(); return; }
    const file = (pathname.startsWith('/assets/') ? containedFile(options.publicDirectory, pathname) : null)
      ?? containedFile(options.distDirectory, pathname);
    if (!file) { next(); return; }
    const size = fs.statSync(file).size;
    let start = 0;
    let end = size - 1;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (range && (range[1] || range[2])) {
        start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
        end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      }
      if (!range || (!range[1] && !range[2]) || start > end || start >= size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return;
      }
    }
    const headers: Record<string, string | number> = { 'Content-Type': contentTypes[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': Math.max(0, end - start + 1), 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' };
    if (req.headers.range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    res.writeHead(req.headers.range ? 206 : 200, headers);
    if (req.method === 'HEAD' || size === 0) { res.end(); return; }
    const stream = fs.createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  });
  return server;
}
