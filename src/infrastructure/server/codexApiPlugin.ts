import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { createChatGPT } from '../chatgpt/devkit';
import { assistantDataDirectory, windowsCredentialEncryption } from '../chatgpt/protectedStorage';
import { checkRuntime } from '../codex/runtime';
import { AssistantService, type PreviewRenderer } from '../../application/assistant/assistantService';
import { AssistantError, safeAssistantError } from '../../application/assistant/errors';
import { renderService } from '../../application/render/renderService';
import { RenderProfile } from '../../config/render.config';
import { PATHS } from '../../config/paths.config';
import type { AssistantStatus } from '../../shared/types/assistant';

const ownerSchema = z.object({ conversationId: z.string().uuid(), epoch: z.string().uuid() });
export function validLocalRequest(req: IncomingMessage, origin: string, capability: string, requireCapability = true): boolean {
  if (req.headers.host !== new URL(origin).host) return false;
  if (req.headers.origin && req.headers.origin !== origin) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site' || req.headers['sec-fetch-site'] === 'same-site') return false;
  return !requireCapability || req.headers['x-icegozi-capability'] === capability;
}

async function requestBody(req: IncomingMessage): Promise<unknown> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new AssistantError('content_type', 'Cần JSON.', 415);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk as Buffer);
    size += buffer.length;
    if (size > 1024 * 1024) throw new AssistantError('body_limit', 'Payload quá lớn.', 413);
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AssistantError('invalid_json', 'JSON không hợp lệ.'); }
}

export function codexApiPlugin(): Plugin {
  const capability = randomBytes(32).toString('base64url');
  const directory = assistantDataDirectory();
  let loginUrl: string | null = null;
  let loginOperation: Promise<unknown> | null = null;
  let loginError: ReturnType<typeof safeAssistantError> | null = null;
  const auth = createChatGPT({ appId: 'icegozi-video', appName: 'icegozi-video', storageDir: path.join(directory, 'auth'),
    redirectPort: 0, sendHostId: true, credentialEncryption: windowsCredentialEncryption(),
    openBrowser: (url) => { loginUrl = url; },
  });
  const renderer: PreviewRenderer = {
    create: (project) => renderService.createJob(project, RenderProfile.Preview),
    status: (id) => {
      const job = renderService.getJob(id);
      return job ? { status: job.status, progress: job.progress, outputReady: !!job.outputPath && fs.existsSync(job.outputPath) && fs.statSync(job.outputPath).size > 1000 } : null;
    },
    cancel: (id) => renderService.cancelJob(id),
  };
  const service = new AssistantService(auth, renderer, directory);
  let runtimeStatus: Awaited<ReturnType<typeof checkRuntime>> | undefined;
  const connections = new Set<ServerResponse>();
  let origin = 'http://127.0.0.1:3200';

  const status = async (): Promise<AssistantStatus> => {
    const session = await auth.getSession();
    const error = loginError ?? (session.error ? safeAssistantError(session.error) : null);
    const safeAuth = { status: session.status, sharing: session.sharing,
      ...(session.profileId ? { profileId: session.profileId, profileLabel: session.profileLabel, identity: session.identity } : {}),
      ...(error ? { error: { code: error.code, message: error.message, retryable: false } } : {}),
    };
    runtimeStatus ??= await checkRuntime();
    const profiles = await auth.listProfiles().catch(() => []);
    return { auth: safeAuth, profiles: profiles.map(({ id, label, status: profileStatus, sharing, pending }) => ({ id, label, status: profileStatus, sharing, pending })),
      models: [], runtime: runtimeStatus, loginUrl };
  };
  const json = (res: ServerResponse, body: unknown, code = 200) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  const closeStreams = () => { for (const response of connections) response.end(); connections.clear(); };
  const reset = () => { service.reset(); closeStreams(); loginUrl = null; loginError = null; };

  return {
    name: 'icegozi-codex-api',
    transformIndexHtml() { return [{ tag: 'meta', attrs: { name: 'icegozi-capability', content: capability }, injectTo: 'head' }]; },
    configureServer(server) {
      origin = `http://127.0.0.1:${server.config.server.port ?? 3200}`;
      server.httpServer?.once('close', () => { auth.cancelSignIn(); reset(); });
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', origin);
        // Guard the document carrying bootstrap capability and all local bridge endpoints.
        if (!validLocalRequest(req, origin, capability, false)) { json(res, { error: 'Local origin bị từ chối.' }, 403); return; }
        if (!url.pathname.startsWith('/api/codex/')) { next(); return; }
        if (!validLocalRequest(req, origin, capability)) { json(res, { error: 'Phiên bridge không hợp lệ. Refresh trang local.' }, 403); return; }
        try {
          if (req.method === 'GET' && url.pathname === '/api/codex/status') { json(res, await status()); return; }
          if (req.method === 'GET' && url.pathname === '/api/codex/models') { json(res, { models: await auth.listModels() }); return; }
          if (req.method === 'GET' && url.pathname === '/api/codex/events') {
            const owner = ownerSchema.parse(Object.fromEntries(url.searchParams));
            const after = Number(req.headers['last-event-id'] ?? 0);
            if (!Number.isSafeInteger(after) || after < 0 || connections.size >= 32) throw new AssistantError('stream_limit', 'Không mở được stream này.');
            let unsubscribe: (() => void) | undefined;
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('X-Accel-Buffering', 'no');
            unsubscribe = await service.subscribe(owner.conversationId, owner.epoch, after, (event) => {
              if (res.writableLength > 1024 * 1024) { res.end(); return; }
              res.write(`id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`);
            });
            connections.add(res);
            const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000);
            const idle = setTimeout(() => res.end(), 5 * 60_000);
            res.once('close', () => { clearInterval(heartbeat); clearTimeout(idle); unsubscribe?.(); connections.delete(res); });
            return;
          }
          if (req.method === 'GET' && url.pathname.startsWith('/api/codex/preview/')) {
            const owner = ownerSchema.parse(Object.fromEntries(url.searchParams));
            const jobId = url.pathname.slice('/api/codex/preview/'.length);
            const preview = await service.previewStatus(owner.conversationId, owner.epoch, jobId);
            if (!preview.downloadUrl) throw new AssistantError('render_not_ready', 'MP4 chưa sẵn sàng.', 409);
            const job = renderService.getJob(jobId);
            if (!job?.outputPath) throw new AssistantError('render_missing', 'Không có output.', 404);
            const output = fs.realpathSync(job.outputPath);
            const relative = path.relative(fs.realpathSync(PATHS.previews), output);
            if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new AssistantError('output_path', 'Output ngoài phạm vi.', 403);
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Cache-Control', 'no-store');
            const stream = fs.createReadStream(output);
            stream.on('error', () => res.destroy());
            res.on('close', () => stream.destroy());
            stream.pipe(res);
            return;
          }
          if (req.method !== 'POST') { json(res, { error: 'Endpoint không tồn tại.' }, 404); return; }
          const body = await requestBody(req);
          if (url.pathname === '/api/codex/login') {
            const options = z.object({ newProfile: z.boolean().optional(), profileId: z.string().optional() }).strict().parse(body);
            if (loginOperation) throw new AssistantError('login_busy', 'Có attempt đăng nhập đang chờ.', 409);
            reset();
            loginOperation = auth.signIn(options).catch((error: unknown) => { loginError = safeAssistantError(error); }).finally(() => { loginOperation = null; loginUrl = null; });
            json(res, { started: true }); return;
          }
          if (url.pathname === '/api/codex/login/cancel') { auth.cancelSignIn(); loginUrl = null; json(res, { cancelled: true }); return; }
          if (url.pathname === '/api/codex/logout') { reset(); await auth.disconnect(); json(res, await status()); return; }
          if (url.pathname === '/api/codex/profile') {
            const { profileId } = z.object({ profileId: z.string() }).strict().parse(body);
            reset(); await auth.selectProfile(profileId); json(res, await status()); return;
          }
          if (url.pathname === '/api/codex/conversation') { json(res, await service.open(body)); return; }
          const owner = ownerSchema.parse(body);
          if (url.pathname === '/api/codex/turn') {
            const input = ownerSchema.extend({ requestId: z.string().uuid(), text: z.string().trim().min(1).max(8000), model: z.string().min(1).max(200), snapshot: z.unknown() }).strict().parse(body);
            json(res, await service.send(input.conversationId, input.epoch, input.requestId, input.text, input.model, input.snapshot)); return;
          }
          if (url.pathname === '/api/codex/turn/cancel') { ownerSchema.strict().parse(body); await service.cancel(owner.conversationId, owner.epoch); json(res, { cancelled: true }); return; }
          if (url.pathname === '/api/codex/approval') {
            const input = ownerSchema.extend({ approvalId: z.string(), decision: z.enum(['accept', 'decline', 'cancel']) }).strict().parse(body);
            await service.approval(input.conversationId, input.epoch, input.approvalId, input.decision); json(res, { resolved: true }); return;
          }
          if (url.pathname === '/api/codex/proposal/dismiss') {
            const input = ownerSchema.extend({ proposalId: z.string().uuid() }).strict().parse(body);
            await service.dismiss(input.conversationId, input.epoch, input.proposalId); json(res, { dismissed: true }); return;
          }
          if (url.pathname === '/api/codex/render') {
            const input = ownerSchema.extend({ requestId: z.string().uuid(), snapshot: z.unknown() }).strict().parse(body);
            json(res, await service.render(input.conversationId, input.epoch, input.requestId, input.snapshot)); return;
          }
          if (url.pathname === '/api/codex/render/status' || url.pathname === '/api/codex/render/cancel') {
            const input = ownerSchema.extend({ jobId: z.string() }).strict().parse(body);
            if (url.pathname.endsWith('/cancel')) { await service.cancelRender(input.conversationId, input.epoch, input.jobId); json(res, { cancelled: true }); }
            else json(res, await service.previewStatus(input.conversationId, input.epoch, input.jobId));
            return;
          }
          json(res, { error: 'Endpoint không tồn tại.' }, 404);
        } catch (error) {
          if (!res.headersSent) { const safe = safeAssistantError(error); json(res, { error: safe.message, code: safe.code }, safe.status); }
          else res.end();
        }
      });
    },
  };
}
