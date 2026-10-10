import fs from 'node:fs';
import path from 'node:path';
import { AssistantError } from '../assistant/errors';

/** Resolves a path and rejects candidates that escape the owned workspace. */
export function containedPath(root: string, candidate: string, mustExist = true): string {
  const directory = fs.realpathSync(root);
  const actual = mustExist
    ? fs.realpathSync(candidate)
    : path.join(fs.realpathSync(path.dirname(candidate)), path.basename(candidate));
  const relative = path.relative(directory, actual);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AssistantError('asset_path', 'Media ngoài thư mục cho phép.');
  }
  return actual;
}
