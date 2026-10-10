import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { GenerationSecureStore } from '../../src/infrastructure/scene-generation/secureStore';
import { GoogleOAuthConnection } from '../../src/infrastructure/scene-generation/googleOAuth';
import type { CredentialEncryption } from '../../src/infrastructure/chatgpt/devkit/types';
import { GeminiImageProvider } from '../../src/infrastructure/scene-generation/GeminiImageProvider';
import { GENERATION_PRESETS } from '../../src/application/scene-generation/catalog';
import { GenerationRequestSchema, type GenerationPlan } from '../../src/application/scene-generation/generation.contracts';
import { fixtureGoogle, fixturePng } from '../fixtures/generation-fixtures';
import { randomUUID } from 'node:crypto';

const owned: { directory: string; auth?: GoogleOAuthConnection }[] = [];
afterEach(() => {
  for (const item of owned.splice(0)) {
    item.auth?.cancel();
    const actual = fs.realpathSync(item.directory);
    expect(path.dirname(actual).toLowerCase()).toBe(fs.realpathSync(os.tmpdir()).toLowerCase());
    expect(path.basename(actual)).toMatch(/^icegozi-google-test-/);
    fs.rmSync(actual, { recursive: true, force: true });
  }
});
const fixtureEncryption: CredentialEncryption = {
  id: 'test-only-xor',
  isAvailable: () => true,
  encrypt: async (value) => Buffer.from(value).map((byte) => byte ^ 170),
  decrypt: async (value) =>
    Buffer.from(Buffer.from(value).map((byte) => byte ^ 170)).toString('utf8'),
};
const config = {
  clientId: 'fixture-client.apps.googleusercontent.com',
  clientSecret: 'fixture-client-secret',
  projectId: 'fixture-project',
};
const apiKeyConfig = {
  mode: 'api_key',
  apiKey: 'fixture-only-gemini-key-00000001',
};

describe('Official Google desktop OAuth for image generation', () => {
  it('stores and restores an AQ authorization key without exposing it in status or validation errors', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-google-test-'));
    const store = new GenerationSecureStore(directory, fixtureEncryption);
    const request = vi.fn();
    const auth = new GoogleOAuthConnection(store, { fetch: request as typeof fetch });
    owned.push({ directory, auth });
    const key = 'AQ.fixture_only_not_a_real_key_000001';
    await auth.configure('owner', { mode: 'api_key', apiKey: key });
    const status = await auth.status('owner');
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain(key);
    const reopened = new GoogleOAuthConnection(new GenerationSecureStore(directory, fixtureEncryption));
    expect((await reopened.credential('owner', status.connection!.version)).apiKey).toBe(key);
    await expect(auth.configure('owner', { mode: 'api_key', apiKey: key + '\u200b' })).rejects.toThrow('ký tự ẩn');
    expect((await auth.status('owner')).connection?.version).toBe(status.connection!.version);
    await expect(auth.configure('owner', { mode: 'api_key', apiKey: key, maxJobCostMicros: 1 })).rejects.toThrow('0.01–10 USD');
    expect(request).not.toHaveBeenCalled();
  });
  it('persists API keys encrypted, restores them without login, rotates versions and removes keys on disconnect', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-google-test-'));
    const request = vi.fn();
    const store = new GenerationSecureStore(directory, fixtureEncryption);
    const auth = new GoogleOAuthConnection(store, {
      fetch: request as typeof fetch,
    });
    owned.push({ directory, auth });
    await auth.configure('owner', apiKeyConfig);
    const status = await auth.status('owner');
    expect(status.authMode).toBe('api_key');
    expect(status.status).toBe('connected');
    expect(status.identity).toBeUndefined();
    expect(status.loginUrl).toBeNull();
    expect(status.connection?.label).toBe('Gemini API key');
    expect(JSON.stringify(status)).not.toContain(apiKeyConfig.apiKey);
    for (const file of fs.readdirSync(directory))
      if (file.endsWith('.enc'))
        expect(fs.readFileSync(path.join(directory, file), 'utf8')).not.toContain(
          apiKeyConfig.apiKey,
        );
    const reopened = new GoogleOAuthConnection(
      new GenerationSecureStore(directory, fixtureEncryption),
    );
    expect(await reopened.credential('owner', status.connection!.version)).toEqual({
      apiKey: apiKeyConfig.apiKey,
      version: status.connection!.version,
    });
    await expect(auth.start('owner')).rejects.toThrow('không cần đăng nhập');
    for (const invalid of [
      { ...apiKeyConfig, apiKey: 'YOUR_GEMINI_API_KEY' },
      { ...apiKeyConfig, apiKey: 'bad key containing spaces' },
      { ...apiKeyConfig, maxJobCostMicros: 30000, dailyBudgetMicros: 20000 },
    ])
      await expect(auth.configure('owner', invalid)).rejects.toThrow();
    expect((await auth.status('owner')).connection?.version).toBe(status.connection!.version);
    await auth.configure('owner', {
      ...apiKeyConfig,
      apiKey: 'fixture-only-gemini-key-00000002',
    });
    await expect(reopened.credential('owner', status.connection!.version)).rejects.toThrow(
      'đã đổi',
    );
    const rotated = (await auth.status('owner')).connection!;
    await auth.disconnect('owner');
    expect((await auth.status('owner')).configured).toBe(false);
    expect((await auth.status('owner')).connection).toBeNull();
    expect(JSON.stringify(await store.read('owner'))).not.toContain('fixture-only-gemini-key');
    await expect(auth.credential('owner', rotated.version)).rejects.toThrow('đã đổi');
    expect(request).not.toHaveBeenCalled();
  });
  it('does not overwrite a newer connection saved by another app instance', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-google-test-'));
    owned.push({ directory });
    const first = new GenerationSecureStore(directory, fixtureEncryption);
    const second = new GenerationSecureStore(directory, fixtureEncryption);
    await first.write('owner', { version: 'old', value: 'old-connection' });
    await first.read('owner');
    await second.write('owner', { version: 'new', value: 'new-connection' });
    await expect(
      first.write('owner', { version: 'old', value: 'stale-refresh' }, () => true, 'old'),
    ).rejects.toThrow('bản app khác');
    expect(await first.read('owner')).toEqual({
      version: 'new',
      value: 'new-connection',
    });
  });
  it('keeps a newer login alive when a cancelled callback completes late', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-google-test-'));
    let release: (() => void) | undefined;
    let verified = 0;
    const auth = new GoogleOAuthConnection(
      new GenerationSecureStore(directory, fixtureEncryption),
      {
        fetch: (async () =>
          Response.json({
            access_token: 'fixture-access',
            refresh_token: 'fixture-refresh',
            id_token: 'fixture-id',
            expires_in: 3600,
            scope: 'openid email profile https://www.googleapis.com/auth/cloud-platform',
          })) as typeof fetch,
        verify: async () => {
          verified++;
          if (verified === 1)
            await new Promise<void>((resolve) => {
              release = resolve;
            });
          return { sub: 'fixture-sub' };
        },
      },
    );
    owned.push({ directory, auth });
    await auth.configure('owner', config);
    await auth.start('owner');
    const first = new URL((await auth.status('owner')).loginUrl!);
    const firstCallback = new URL(first.searchParams.get('redirect_uri')!);
    firstCallback.searchParams.set('state', first.searchParams.get('state')!);
    firstCallback.searchParams.set('code', 'first-fixture-code');
    const cancelled = fetch(firstCallback).catch(() => null);
    await vi.waitFor(() => expect(release).toBeDefined());
    auth.cancel('owner');
    await auth.start('owner');
    const second = new URL((await auth.status('owner')).loginUrl!);
    release!();
    await cancelled;
    expect((await auth.status('owner')).status).toBe('connecting');
    const secondCallback = new URL(second.searchParams.get('redirect_uri')!);
    secondCallback.searchParams.set('state', second.searchParams.get('state')!);
    secondCallback.searchParams.set('code', 'second-fixture-code');
    expect((await fetch(secondCallback)).status).toBe(200);
    expect((await auth.status('owner')).status).toBe('connected');
  });
  it('uses PKCE/state, checks callback host and keeps credential values out of status and plaintext files', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-google-test-'));
    const fetchMock = vi.fn(async () =>
      Response.json({
        access_token: 'fixture-access',
        refresh_token: 'fixture-refresh',
        id_token: 'fixture-id',
        expires_in: 3600,
        scope: 'openid email profile https://www.googleapis.com/auth/cloud-platform',
      }),
    );
    const verify = vi.fn(async () => ({
      sub: 'fixture-google-sub',
      email: 'fixture@example.invalid',
    }));
    const auth = new GoogleOAuthConnection(
      new GenerationSecureStore(directory, fixtureEncryption),
      { fetch: fetchMock as typeof fetch, verify },
    );
    owned.push({ directory, auth });
    await auth.configure('owner', config);
    await auth.start('owner');
    const before = await auth.status('owner');
    const authorization = new URL(before.loginUrl!);
    expect(authorization.origin).toBe('https://accounts.google.com');
    expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorization.searchParams.get('scope')).toContain('cloud-platform');
    const redirect = new URL(authorization.searchParams.get('redirect_uri')!);
    expect(redirect.hostname).toBe('127.0.0.1');
    redirect.searchParams.set('state', 'wrong');
    redirect.searchParams.set('code', 'fixture-code');
    expect((await fetch(redirect)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    redirect.searchParams.set('state', authorization.searchParams.get('state')!);
    expect((await fetch(redirect)).status).toBe(200);
    await vi.waitFor(async () => expect((await auth.status('owner')).status).toBe('connected'));
    const status = await auth.status('owner');
    expect(status.identity?.email).toBe('fixture@example.invalid');
    expect(JSON.stringify(status)).not.toMatch(
      /fixture-access|fixture-refresh|fixture-client-secret/,
    );
    const request = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const tokenBody = request[1].body as URLSearchParams;
    expect(tokenBody.get('code_verifier')).toBeTruthy();
    expect(tokenBody.get('redirect_uri')).toContain('127.0.0.1');
    expect(
      fs.readFileSync(path.join(directory, fs.readdirSync(directory)[0])).toString('utf8'),
    ).not.toContain('fixture-client-secret');
    expect(verify).toHaveBeenCalledWith(
      'fixture-id',
      config.clientId,
      authorization.searchParams.get('nonce'),
    );
  });
  it('refreshes a connection once for concurrent callers and refuses the prior version after disconnect', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-google-test-'));
    const request = vi.fn(async (_url: unknown, options?: RequestInit) => {
      if (String(_url).includes('revoke')) return new Response('', { status: 200 });
      const refresh = (options?.body as URLSearchParams).get('grant_type') === 'refresh_token';
      return Response.json({
        access_token: refresh ? 'fixture-new-access' : 'fixture-access',
        refresh_token: 'fixture-refresh',
        id_token: 'fixture-id',
        expires_in: refresh ? 3600 : 1,
        scope: 'openid email profile https://www.googleapis.com/auth/cloud-platform',
      });
    });
    const auth = new GoogleOAuthConnection(
      new GenerationSecureStore(directory, fixtureEncryption),
      {
        fetch: request as typeof fetch,
        verify: async () => ({ sub: 'fixture-sub' }),
      },
    );
    owned.push({ directory, auth });
    await auth.configure('owner', config);
    await auth.start('owner');
    const authorization = new URL((await auth.status('owner')).loginUrl!);
    const callback = new URL(authorization.searchParams.get('redirect_uri')!);
    callback.searchParams.set('state', authorization.searchParams.get('state')!);
    callback.searchParams.set('code', 'fixture-code');
    await fetch(callback);
    const connection = (await auth.status('owner')).connection!;
    const credentials = await Promise.all([
      auth.credential('owner', connection.version),
      auth.credential('owner', connection.version),
    ]);
    expect(credentials[0].accessToken).toBe('fixture-new-access');
    expect(credentials[1]).toEqual(credentials[0]);
    expect(request).toHaveBeenCalledTimes(2);
    await auth.disconnect('owner');
    await expect(auth.credential('owner', connection.version)).rejects.toThrow('Google');
    expect((await auth.status('owner')).connection).toBeNull();
  });
  it.each(['oauth', 'api_key', 'authorization_key'])(
    'calls the image model with %s headers and bounded inline results',
    async (mode) => {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-google-test-'));
      owned.push({ directory });
      const image = path.join(directory, 'fixture.png');
      fixturePng(image);
      const request = vi.fn(async () =>
        Response.json({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: fs.readFileSync(image).toString('base64'),
                    },
                  },
                ],
              },
            },
          ],
        }),
      );
      const google =
        mode === 'oauth'
          ? fixtureGoogle()
          : new GoogleOAuthConnection(new GenerationSecureStore(directory, fixtureEncryption));
      const providerKey = mode === 'authorization_key' ? 'AQ.fixture_only_not_a_real_key_000001' : apiKeyConfig.apiKey;
      if (mode !== 'oauth') await google.configure('owner', { ...apiKeyConfig, apiKey: providerKey });
      const connection = (await google.status('owner')).connection!;
      const plan: GenerationPlan = {
        id: randomUUID(),
        profileId: 'owner',
        conversationId: randomUUID(),
        epoch: randomUUID(),
        projectId: 'fixture-project',
        request: GenerationRequestSchema.parse({
          kind: 'image',
          presetId: 'gemini-image-landscape',
          prompt: 'Fox',
        }),
        preset: GENERATION_PRESETS[0],
        connection,
        baseRevision: 1,
        fps: 30,
        fingerprint: '0'.repeat(64),
        digest: '0'.repeat(64),
        referenceHashes: [],
        status: 'approved',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000,
        estimate: {
          costMicros: 125000,
          currency: 'USD',
          pricingVersion: 'fixture',
          verifiedAt: '2026-10-10',
          source: 'fixture',
          expiresAt: Date.now() + 1000,
          isEstimate: true,
        },
      };
      const provider = new GeminiImageProvider(google, request as typeof fetch);
      const output = path.join(directory, 'result.png');
      await provider.generate(plan, output, undefined, new AbortController().signal);
      expect(fs.readFileSync(output)).toEqual(fs.readFileSync(image));
      const call = request.mock.calls[0] as unknown as [string, RequestInit];
      expect(call[0]).toContain('gemini-3.1-flash-lite-image:generateContent');
      expect(call[0]).not.toContain('?key=');
      const headers = new Headers(call[1].headers);
      if (mode === 'oauth') {
        expect(headers.get('authorization')).toBe('Bearer fixture-google-token');
        expect(headers.get('x-goog-user-project')).toBe('fixture-project');
        expect(headers.has('x-goog-api-key')).toBe(false);
      } else {
        expect(headers.get('x-goog-api-key')).toBe(providerKey);
        expect(headers.has('authorization')).toBe(false);
        expect(headers.has('x-goog-user-project')).toBe(false);
        expect(call[0]).not.toContain(providerKey);
      }
      const body = JSON.parse(call[1].body as string);
      expect(body.generationConfig.maxOutputTokens).toBe(4096);
      expect(body.generationConfig.responseModalities).toEqual(['IMAGE']);
      expect(JSON.stringify(body)).not.toContain('fixture-google-token');
      expect(JSON.stringify(body)).not.toContain(providerKey);
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
});
