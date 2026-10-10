import assert from 'node:assert/strict';
import test from 'node:test';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdtemp, rm, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createChatGPT } from '../../src/infrastructure/chatgpt/devkit/index.ts';
import { ConnectionStore } from '../../src/infrastructure/chatgpt/devkit/storage.ts';

const issuer = 'https://auth.openai.com';
const clientId = 'fixture_client';
const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwks = { keys: [{ ...await exportJWK(publicKey), kid: 'lifecycle', alg: 'RS256', use: 'sig' }] };
const sign = (nonce) => new SignJWT({ sub: 'fixture-subject', nonce, email: 'fixture@example.invalid' })
  .setProtectedHeader({ alg: 'RS256', kid: 'lifecycle' }).setIssuedAt().setIssuer(issuer).setAudience(clientId).setExpirationTime('1h').sign(privateKey);

async function fixture(t, expire = false) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'icegozi-auth-test-'));
  t.after(async () => {
    const resolved = await realpath(directory);
    assert.equal(path.dirname(resolved).toLowerCase(), (await realpath(os.tmpdir())).toLowerCase());
    assert.ok(path.basename(resolved).startsWith('icegozi-auth-test-'));
    await rm(resolved, { recursive: true, force: true });
  });
  const key = randomBytes(32);
  const encryption = { id: 'test-only-ephemeral', isAvailable: () => true,
    encrypt: (text) => { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv); return Buffer.concat([iv, cipher.update(text), cipher.final(), cipher.getAuthTag()]); },
    decrypt: (data) => { const bytes = Buffer.from(data); const cipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12)); cipher.setAuthTag(bytes.subarray(-16)); return Buffer.concat([cipher.update(bytes.subarray(12, -16)), cipher.final()]).toString('utf8'); },
  };
  let url;
  const client = createChatGPT({ appName: 'icegozi-video', appId: 'icegozi-video', storageDir: directory, redirectPort: 0, sendHostId: true, credentialEncryption: encryption, openBrowser: (value) => { url = new URL(value); } });
  const store = new ConnectionStore(directory, encryption);
  const saved = { version: 2, activeProfileId: 'existing', pendingRegistrations: [], profiles: [{ version: 1, id: 'existing', label: 'Existing', clientId, subject: 'fixture-subject', status: 'connected', scopes: ['chatgpt.tokens.use.direct', 'offline_access'], savedAt: new Date().toISOString(), credentials: { accessToken: 'old-fixture', refreshToken: 'old-refresh-fixture', expiresAt: Date.now() + (expire ? 1000 : 3600000) } }] };
  await store.withLock(() => store.write(saved));
  let exchange = 0;
  let refreshHandler = async () => ({ access_token: 'replacement-fixture', refresh_token: 'replacement-refresh-fixture', token_type: 'Bearer', scope: 'chatgpt.tokens.use.direct offline_access', expires_in: 3600 });
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const endpoint = String(input);
    if (endpoint.endsWith('/.well-known/openid-configuration')) return Response.json({ issuer, authorization_endpoint: issuer + '/authorize', token_endpoint: issuer + '/token', jwks_uri: issuer + '/keys', revocation_endpoint: issuer + '/revoke' });
    if (endpoint === issuer + '/keys') return Response.json(jwks);
    if (endpoint === issuer + '/token') {
      exchange++;
      if (options.body.get('grant_type') === 'refresh_token') return Response.json(await refreshHandler());
      return Response.json({ id_token: await sign(url.searchParams.get('nonce')), access_token: 'identity-only-fixture', token_type: 'Bearer', scope: 'openid profile email', expires_in: 3600 });
    }
    if (endpoint === issuer + '/revoke') return new Response('', { status: 200 });
    if (endpoint === 'https://api.openai.com/v1/models') return Response.json({ models: [] });
    assert.fail('Unexpected endpoint in synthetic auth test');
  });
  return { client, store, url: () => url, exchanges: () => exchange, setRefresh: (handler) => { refreshHandler = handler; } };
}
async function waitForUrl(f) {
  for (let tries = 0; tries < 100; tries++) { if (f.url()) return f.url(); await new Promise((resolve) => setTimeout(resolve, 5)); }
  assert.fail('Synthetic callback listener did not start');
}
async function callback(url, parameters) {
  const destination = new URL(url.searchParams.get('redirect_uri'));
  for (const [key, value] of Object.entries(parameters)) destination.searchParams.set(key, value);
  // Bypass mocked external fetch; only the real loopback callback listener is contacted.
  const { get } = await import('node:http');
  return new Promise((resolve, reject) => { const request = get(destination, (response) => { response.resume(); response.on('end', () => resolve(response.statusCode)); }); request.on('error', reject); });
}

test('wrong callback state never exchanges a code or overwrites the active profile', async (t) => {
  const f = await fixture(t);
  const pending = f.client.signIn({ newProfile: true }); const rejected = assert.rejects(pending, (error) => error.code === 'cancelled');
  const url = await waitForUrl(f);
  assert.equal(await callback(url, { code: 'fixture-code', client_id: clientId, state: 'wrong' }), 400);
  f.client.cancelSignIn(); await rejected;
  assert.equal(f.exchanges(), 0);
  assert.equal((await f.client.getSession()).profileId, 'existing');
});
test('declined consent preserves the active registration and does not exchange credentials', async (t) => {
  const f = await fixture(t);
  const pending = f.client.signIn({ newProfile: true }); const rejected = assert.rejects(pending, (error) => error.code === 'access_denied');
  const url = await waitForUrl(f);
  await callback(url, { error: 'access_denied', state: url.searchParams.get('state') }); await rejected;
  assert.equal(f.exchanges(), 0); assert.equal((await f.client.getSession()).profileId, 'existing');
});
test('cancel closes the listener and late callbacks cannot sign in', async (t) => {
  const f = await fixture(t); const pending = f.client.signIn({ newProfile: true }); const rejected = assert.rejects(pending, (error) => error.code === 'cancelled');
  const url = await waitForUrl(f); f.client.cancelSignIn(); await rejected;
  await assert.rejects(callback(url, { code: 'late', state: url.searchParams.get('state'), client_id: clientId }));
  assert.equal((await f.client.getSession()).profileId, 'existing');
});
test('identity-only sign-in never enables ChatGPT plan inference', async (t) => {
  const f = await fixture(t); const pending = f.client.signIn({ newProfile: true }); const url = await waitForUrl(f);
  await callback(url, { code: 'fixture-code', state: url.searchParams.get('state'), client_id: clientId });
  assert.equal((await pending).sharing, false);
  await assert.rejects(f.client.getRuntimeCredential(), (error) => error.code === 'sharing_not_enabled');
});
test('concurrent requests serialize one rotating refresh and store the successor atomically', async (t) => {
  const f = await fixture(t, true);
  await Promise.all([f.client.getRuntimeCredential(), f.client.getRuntimeCredential()]);
  assert.equal(f.exchanges(), 1);
  const saved = await f.store.withLock(() => f.store.read());
  assert.equal(saved.profiles[0].credentials.refreshToken, 'replacement-refresh-fixture');
  assert.equal(JSON.stringify(await f.client.getSession()).includes('fixture-token'), false);
});
test('logout during refresh cannot restore or return the old credential', async (t) => {
  const f = await fixture(t, true);
  let release; let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  f.setRefresh(async () => { started(); await gate; return { access_token: 'successor-fixture', refresh_token: 'successor-refresh', token_type: 'Bearer', scope: 'chatgpt.tokens.use.direct offline_access', expires_in: 3600 }; });
  const token = f.client.getRuntimeCredential(); const rejected = assert.rejects(token, (error) => error.code === 'cancelled');
  await ready; const logout = f.client.disconnect(); release(); await Promise.all([rejected, logout]);
  assert.equal((await f.client.getSession()).sharing, false);
  const saved = await f.store.withLock(() => f.store.read()); assert.equal(saved.profiles[0].credentials, undefined);
});
