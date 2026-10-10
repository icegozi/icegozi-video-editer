import fs from 'node:fs';
import { deflateSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import type {
  GoogleConnection,
  GoogleConnectionStatus,
} from '../../src/application/scene-generation/generation.contracts';
import type { SceneGenerationProvider } from '../../src/application/scene-generation/SceneGenerationProvider';

export function fixtureGoogle(): GoogleConnection {
  const connection = {
    id: randomUUID(),
    version: randomUUID(),
    providerId: 'gemini',
    label: 'fixture@example.invalid',
    maxJobCostMicros: 250000,
    dailyBudgetMicros: 2000000,
  };
  let connected = true;
  let mode: 'oauth' | 'api_key' = 'oauth';
  let apiKey: string | undefined;
  const status = async (): Promise<GoogleConnectionStatus> => ({
    configured: mode === 'oauth' || !!apiKey,
    authMode: mode,
    status: connected ? 'connected' : 'disconnected',
    connection: connected ? connection : null,
    loginUrl: null,
    error: null,
    projectId: 'fixture-project',
    identity: mode === 'oauth' ? { email: 'fixture@example.invalid' } : undefined,
  });
  return {
    status,
    configure: async (_owner, raw) => {
      const config = raw as { mode?: string; apiKey?: string };
      mode = config.mode === 'api_key' ? 'api_key' : 'oauth';
      apiKey = mode === 'api_key' ? config.apiKey : undefined;
      connected = mode === 'api_key';
      connection.label = mode === 'api_key' ? 'Gemini API key' : 'fixture@example.invalid';
      connection.version = randomUUID();
    },
    start: async () => {
      connected = true;
    },
    cancel: () => {},
    disconnect: async () => {
      connected = false;
      apiKey = undefined;
      connection.version = randomUUID();
    },
    credential: async () =>
      apiKey
        ? { apiKey, version: connection.version }
        : {
            accessToken: 'fixture-google-token',
            projectId: 'fixture-project',
            version: connection.version,
          },
  };
}
export function fixturePng(file: string) {
  const chunk = (type: string, bytes: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), bytes]);
    let crc = 0xffffffff;
    for (const value of body) {
      crc ^= value;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const header = Buffer.alloc(4);
    header.writeUInt32BE(bytes.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([header, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(64, 0);
  header.writeUInt32BE(64, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc((64 * 4 + 1) * 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const offset = y * 257 + 1 + x * 4;
      pixels[offset] = 217;
      pixels[offset + 1] = 107;
      pixels[offset + 2] = 41;
      pixels[offset + 3] = 255;
    }
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(pixels)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
export function fixtureImageProvider(png: string): SceneGenerationProvider {
  return {
    id: 'gemini',
    generate: async (_plan, output, _reference, signal) => {
      signal.throwIfAborted();
      fs.copyFileSync(png, output, fs.constants.COPYFILE_EXCL);
      return { mimeType: 'image/png' };
    },
  };
}
