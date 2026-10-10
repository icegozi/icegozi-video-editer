import type { IncomingMessage } from 'node:http';
import { AssistantError } from '../../application/assistant/errors';

export function validLocalRequest(
  request: IncomingMessage,
  origin: string,
  capability: string,
  requireCapability = true,
): boolean {
  if (request.headers.host !== new URL(origin).host) return false;
  if (request.headers.origin && request.headers.origin !== origin) return false;
  if (
    request.headers['sec-fetch-site'] === 'cross-site' ||
    request.headers['sec-fetch-site'] === 'same-site'
  ) {
    return false;
  }
  return !requireCapability || request.headers['x-icegozi-capability'] === capability;
}

export async function readJsonRequest(
  request: IncomingMessage,
  maxBytes = 1024 * 1024,
): Promise<unknown> {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    throw new AssistantError('content_type', 'Cần JSON.', 415);
  }
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk as Buffer);
    size += buffer.length;
    if (size > maxBytes) throw new AssistantError('body_limit', 'Payload quá lớn.', 413);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AssistantError('invalid_json', 'JSON không hợp lệ.');
  }
}
