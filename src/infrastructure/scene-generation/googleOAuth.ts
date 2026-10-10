import http from 'node:http';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { AssistantError } from '../../application/assistant/errors';
import { GenerationSecureStore } from './secureStore';
import type {
  GeminiCredential,
  GenerationConnection,
  GoogleConnection,
  GoogleConnectionStatus,
} from '../../application/scene-generation/generation.contracts';
import { GEMINI_API_KEY_PATTERN, geminiApiKeyInputError, normalizeGeminiApiKey } from '../../application/scene-generation/geminiApiKey';

const budgetFields = {
  maxJobCostMicros: z.number().int().min(10000).max(10000000).default(250000),
  dailyBudgetMicros: z.number().int().min(10000).max(100000000).default(2000000),
};
const apiKeySchema = z
  .string()
  .trim()
  .min(20)
  .max(512)
  .regex(GEMINI_API_KEY_PATTERN);
export const GeminiApiKeyConfigSchema = z
  .object({
    mode: z.literal('api_key'),
    apiKey: z
      .string()
      .max(2048)
      .transform(normalizeGeminiApiKey)
      .pipe(apiKeySchema)
      .refine((value) => !geminiApiKeyInputError(value)),
    ...budgetFields,
  })
  .strict();
export const GoogleConfigSchema = z
  .object({
    clientId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/)
      .max(300),
    clientSecret: z.string().trim().min(1).max(300),
    projectId: z.string().regex(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/),
    ...budgetFields,
  })
  .strict();
const tokenSchema = z.object({
  access_token: z.string().min(1).max(16000),
  expires_in: z.number().positive(),
  refresh_token: z.string().min(1).max(16000).optional(),
  id_token: z.string().max(32000).optional(),
  scope: z.string().optional(),
});
const oauthStoredSchema = z.object({
  id: z.string().uuid(),
  version: z.string().uuid(),
  mode: z.literal('oauth').optional(),
  config: GoogleConfigSchema,
  tokens: z
    .object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresAt: z.number(),
    })
    .optional(),
  identity: z
    .object({
      sub: z.string(),
      email: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});
const apiKeyStoredSchema = z
  .object({
    id: z.string().uuid(),
    version: z.string().uuid(),
    mode: z.literal('api_key'),
    config: z.object(budgetFields).strict(),
    apiKey: apiKeySchema.optional(),
  })
  .strict();
const storedSchema = z.union([oauthStoredSchema, apiKeyStoredSchema]);
type OAuthStoredConnection = z.infer<typeof oauthStoredSchema>;
type StoredConnection = z.infer<typeof storedSchema>;
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const scopes = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/cloud-platform'];
const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
type PendingLogin = {
  server: http.Server;
  timer: ReturnType<typeof setTimeout>;
  controller: AbortController;
  version: string;
  url: string;
  verifying: boolean;
};

export class GoogleOAuthConnection implements GoogleConnection {
  private pending = new Map<string, PendingLogin>();
  private errors = new Map<string, string>();
  private operations = new Map<string, number>();
  private writes = new Map<string, Promise<void>>();
  private refreshes = new Map<string, Promise<GeminiCredential>>();
  constructor(
    private store: GenerationSecureStore,
    private dependencies: {
      fetch?: typeof fetch;
      verify?: (
        token: string,
        audience: string,
        nonce: string,
      ) => Promise<OAuthStoredConnection['identity']>;
    } = {},
  ) {}
  private async read(owner: string): Promise<StoredConnection | null> {
    const raw = await this.store.read(owner);
    return raw ? storedSchema.parse(raw) : null;
  }
  private async write(
    owner: string,
    value: StoredConnection,
    operation: number,
    expectedVersion?: string,
  ): Promise<void> {
    const prior = this.writes.get(owner) ?? Promise.resolve();
    const next = prior
      .catch(() => {})
      .then(async () => {
        if ((this.operations.get(owner) ?? 0) !== operation)
          throw new AssistantError('owner_changed', 'Kết nối Google đã thay đổi.');
        await this.store.write(
          owner,
          value,
          () => (this.operations.get(owner) ?? 0) === operation,
          expectedVersion,
        );
      });
    this.writes.set(owner, next);
    await next;
  }
  async status(owner: string): Promise<GoogleConnectionStatus> {
    const record = await this.read(owner);
    const pending = this.pending.get(owner);
    const oauth = record?.mode !== 'api_key' ? record : null;
    const ready = record?.mode === 'api_key' ? !!record.apiKey : !!oauth?.tokens;
    return {
      configured: record?.mode === 'api_key' ? !!record.apiKey : !!record,
      authMode: record?.mode === 'api_key' ? 'api_key' : record ? 'oauth' : undefined,
      status: pending ? 'connecting' : ready ? 'connected' : 'disconnected',
      ...(record
        ? {
            projectId: oauth?.config.projectId,
            identity: oauth?.identity
              ? { email: oauth.identity.email, name: oauth.identity.name }
              : undefined,
          }
        : {}),
      connection:
        record && ready
          ? {
              id: record.id,
              version: record.version,
              providerId: 'gemini',
              label:
                record.mode === 'api_key'
                  ? 'Gemini API key'
                  : (record.identity?.email ?? 'Google OAuth'),
              maxJobCostMicros: record.config.maxJobCostMicros,
              dailyBudgetMicros: record.config.dailyBudgetMicros,
            }
          : null,
      loginUrl: pending?.url ?? null,
      error: this.errors.get(owner) ?? null,
    };
  }
  async configure(owner: string, raw: unknown): Promise<void> {
    const parsed = z.union([GoogleConfigSchema, GeminiApiKeyConfigSchema]).safeParse(raw);
    if (!parsed.success) {
      if (raw && typeof raw === 'object' && 'mode' in raw && raw.mode === 'api_key') {
        const keyError = geminiApiKeyInputError('apiKey' in raw ? raw.apiKey : undefined);
        throw new AssistantError(
          keyError ? 'gemini_api_key_invalid' : 'google_config_invalid',
          keyError ??
            'Kiểm tra cấu hình API key: mỗi tác vụ 0.01–10 USD, mỗi ngày 0.01–100 USD; chỉ gửi key và giới hạn chi phí.',
        );
      }
      throw new AssistantError(
        'google_config_invalid',
        'Kiểm tra project ID, OAuth Desktop client ID, client secret và giới hạn chi phí.',
      );
    }
    const config = parsed.data;
    if (config.dailyBudgetMicros < config.maxJobCostMicros)
      throw new AssistantError(
        'budget_invalid',
        'Giới hạn mỗi ngày phải lớn hơn giới hạn mỗi tác vụ.',
      );
    this.cancel(owner);
    this.errors.delete(owner);
    const operation = (this.operations.get(owner) ?? 0) + 1;
    this.operations.set(owner, operation);
    await this.write(
      owner,
      'mode' in config
        ? {
            id: randomUUID(),
            version: randomUUID(),
            mode: 'api_key',
            apiKey: config.apiKey,
            config: {
              maxJobCostMicros: config.maxJobCostMicros,
              dailyBudgetMicros: config.dailyBudgetMicros,
            },
          }
        : { id: randomUUID(), version: randomUUID(), config },
      operation,
    );
  }
  private async tokens(body: URLSearchParams, signal: AbortSignal) {
    const response = await (this.dependencies.fetch ?? fetch)(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        redirect: 'error',
        signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );
    if (!response.ok)
      throw new AssistantError(
        'google_token_failed',
        'Google chưa cấp quyền hoặc phiên đã hết hạn. Hãy đăng nhập lại.',
      );
    return tokenSchema.parse(await response.json());
  }
  private async verify(
    token: string,
    audience: string,
    nonce: string,
  ): Promise<OAuthStoredConnection['identity']> {
    if (this.dependencies.verify) return this.dependencies.verify(token, audience, nonce);
    const { payload } = await jwtVerify(token, jwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience,
      algorithms: ['RS256'],
    });
    if (
      payload.nonce !== nonce ||
      !payload.sub ||
      (payload.azp !== undefined && payload.azp !== audience)
    )
      throw new AssistantError('google_identity_failed', 'Không xác minh được tài khoản Google.');
    return {
      sub: payload.sub,
      ...(typeof payload.email === 'string' && payload.email_verified === true
        ? { email: payload.email }
        : {}),
      ...(typeof payload.name === 'string' ? { name: payload.name } : {}),
    };
  }
  async start(owner: string): Promise<void> {
    if (this.pending.has(owner))
      throw new AssistantError('google_login_busy', 'Có phiên đăng nhập Google đang chờ.');
    const record = await this.read(owner);
    if (!record)
      throw new AssistantError(
        'google_config_missing',
        'Nhập cấu hình OAuth Desktop và Google Cloud project trước.',
      );
    if (record.mode === 'api_key')
      throw new AssistantError(
        'google_login_not_required',
        'Gemini API key không cần đăng nhập Google.',
      );
    const operation = (this.operations.get(owner) ?? 0) + 1;
    this.operations.set(owner, operation);
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const controller = new AbortController();
    let redirect = '';
    const server = http.createServer((req, res) => {
      let callback: URL;
      try {
        if (!redirect) throw new Error('Callback not initialized');
        callback = new URL(req.url ?? '/', redirect);
      } catch {
        res.writeHead(400);
        res.end('Invalid callback.');
        return;
      }
      const pending = this.pending.get(owner);
      if (
        req.method !== 'GET' ||
        req.headers.host !== new URL(redirect).host ||
        callback.pathname !== '/google/callback' ||
        !same(callback.searchParams.get('state') ?? '', state)
      ) {
        res.writeHead(400);
        res.end('Invalid callback.');
        return;
      }
      if (!pending || pending.verifying) {
        res.writeHead(409);
        res.end('Login already handled.');
        return;
      }
      pending.verifying = true;
      void (async () => {
        try {
          if (callback.searchParams.has('error'))
            throw new AssistantError('google_declined', 'Bạn chưa cho phép kết nối Google.');
          const code = callback.searchParams.get('code');
          if (!code || code.length > 4096) throw new Error('Invalid code');
          const tokens = await this.tokens(
            new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: record.config.clientId,
              client_secret: record.config.clientSecret,
              code,
              code_verifier: verifier,
              redirect_uri: redirect,
            }),
            AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
          );
          if (
            !tokens.id_token ||
            !tokens.refresh_token ||
            !tokens.scope?.split(' ').includes(scopes[3])
          )
            throw new AssistantError(
              'google_scope_missing',
              'Google chưa cấp quyền Gemini API hoặc quyền duy trì phiên. Hãy đăng nhập lại.',
            );
          const identity = await this.verify(tokens.id_token, record.config.clientId, nonce);
          if (this.pending.get(owner) !== pending || controller.signal.aborted)
            throw new AssistantError('owner_changed', 'Phiên đăng nhập đã đổi.');
          await this.write(
            owner,
            {
              ...record,
              version: randomUUID(),
              identity,
              tokens: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: Date.now() + tokens.expires_in * 1000,
              },
            },
            operation,
            record.version,
          );
          this.errors.delete(owner);
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Đã kết nối Google. Bạn có thể đóng trang này và quay lại ICEGOZI.');
        } catch {
          if (this.pending.get(owner) === pending)
            this.errors.set(
              owner,
              'Không hoàn tất kết nối Google. Kiểm tra OAuth client Desktop, test users, API và quyền Google Cloud.',
            );
          res.writeHead(400);
          res.end('Google connection was not completed. Return to ICEGOZI.');
        } finally {
          if (this.pending.get(owner) === pending) this.cancel(owner);
        }
      })();
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('No callback port');
    }
    redirect = `http://127.0.0.1:${address.port}/google/callback`;
    if (this.operations.get(owner) !== operation) {
      server.close();
      throw new AssistantError('owner_changed', 'Kết nối Google đã thay đổi.');
    }
    const params = new URLSearchParams({
      client_id: record.config.clientId,
      redirect_uri: redirect,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      nonce,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent select_account',
    });
    const timer = setTimeout(() => {
      this.errors.set(owner, 'Đăng nhập Google đã hết thời gian.');
      this.cancel(owner);
    }, 5 * 60_000);
    this.pending.set(owner, {
      server,
      timer,
      controller,
      version: record.version,
      url: 'https://accounts.google.com/o/oauth2/v2/auth?' + params,
      verifying: false,
    });
  }
  cancel(owner?: string): void {
    for (const key of owner
      ? [owner]
      : new Set([...this.operations.keys(), ...this.pending.keys()]))
      this.operations.set(key, (this.operations.get(key) ?? 0) + 1);
    for (const [key, pending] of this.pending)
      if (!owner || key === owner) {
        clearTimeout(pending.timer);
        pending.controller.abort();
        pending.server.close();
        pending.server.closeAllConnections();
        this.pending.delete(key);
      }
    this.store.forget(owner);
  }
  async disconnect(owner: string): Promise<void> {
    this.cancel(owner);
    this.errors.delete(owner);
    const operation = (this.operations.get(owner) ?? 0) + 1;
    this.operations.set(owner, operation);
    const record = await this.read(owner);
    if (record) {
      if (record.mode === 'api_key') {
        await this.write(
          owner,
          {
            id: record.id,
            version: randomUUID(),
            mode: 'api_key',
            config: record.config,
          },
          operation,
          record.version,
        );
        return;
      }
      await this.write(
        owner,
        { id: record.id, version: randomUUID(), config: record.config },
        operation,
        record.version,
      );
      if (record.tokens) {
        try {
          const response = await (this.dependencies.fetch ?? fetch)(
            'https://oauth2.googleapis.com/revoke',
            {
              method: 'POST',
              redirect: 'error',
              signal: AbortSignal.timeout(10000),
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ token: record.tokens.refreshToken }),
            },
          );
          if (!response.ok)
            this.errors.set(
              owner,
              'Đã ngắt kết nối local; chưa xác nhận thu hồi quyền tại Google.',
            );
        } catch {
          this.errors.set(owner, 'Đã ngắt kết nối local; chưa xác nhận thu hồi quyền tại Google.');
        }
      }
    }
  }
  async credential(owner: string, version: string): Promise<GeminiCredential> {
    const existing = this.refreshes.get(owner);
    if (existing) {
      const credential = await existing;
      if (credential.version !== version)
        throw new AssistantError('owner_changed', 'Kết nối Google đã đổi.');
      return credential;
    }
    const refresh = (async () => {
      const operation = this.operations.get(owner) ?? 0;
      const record = await this.read(owner);
      if (!record || record.version !== version)
        throw new AssistantError(
          'credential_expired',
          'Cấu hình Google / Gemini đã đổi. Hãy lập lại yêu cầu.',
        );
      if (record.mode === 'api_key') {
        if (!record.apiKey)
          throw new AssistantError(
            'credential_expired',
            'Hãy nhập Gemini API key mới trong cài đặt.',
          );
        if ((this.operations.get(owner) ?? 0) !== operation)
          throw new AssistantError('owner_changed', 'Kết nối Gemini đã đổi.');
        return { apiKey: record.apiKey, version: record.version };
      }
      if (!record.tokens)
        throw new AssistantError('credential_expired', 'Hãy đăng nhập lại Google để dùng Gemini.');
      if (record.tokens.expiresAt < Date.now() + 60000) {
        const tokens = await this.tokens(
          new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: record.config.clientId,
            client_secret: record.config.clientSecret,
            refresh_token: record.tokens.refreshToken,
          }),
          AbortSignal.timeout(30000),
        );
        record.tokens = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? record.tokens.refreshToken,
          expiresAt: Date.now() + tokens.expires_in * 1000,
        };
        await this.write(owner, record, operation, record.version);
      }
      if ((this.operations.get(owner) ?? 0) !== operation)
        throw new AssistantError('owner_changed', 'Kết nối Google đã đổi.');
      return {
        accessToken: record.tokens.accessToken,
        projectId: record.config.projectId,
        version: record.version,
      };
    })();
    this.refreshes.set(owner, refresh);
    try {
      return await refresh;
    } finally {
      if (this.refreshes.get(owner) === refresh) this.refreshes.delete(owner);
    }
  }
}
