import type { IncomingMessage, ServerResponse } from 'node:http';
import type { EventEmitter } from 'node:events';
import type { AddressInfo } from 'node:net';

export type LocalMiddleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>;

export interface LocalApiServer {
  httpServer?: (EventEmitter & { address(): AddressInfo | string | null }) | null;
  config: { server: { port?: number } };
  middlewares: { use(handler: LocalMiddleware): unknown };
}
