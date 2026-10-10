import Database, { Database as DatabaseInstance } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';
import { logger } from '../logging/logger';
import { migrateDatabase } from './migrations';

let sqliteInstance: DatabaseInstance | null = null;

export function getDatabasePath(): string {
  if (process.env.ICEGOZI_DB_PATH) {
    return process.env.ICEGOZI_DB_PATH;
  }
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return ':memory:';
  }
  return path.resolve(process.cwd(), 'data', 'icegozi.sqlite');
}

/**
 * Closes the active SQLite singleton and resets its reference.
 */
export function closeDatabase(): void {
  if (sqliteInstance) {
    try {
      sqliteInstance.close();
    } catch {
      // Ignore if already closed
    }
    sqliteInstance = null;
  }
}

/**
 * Initializes and configures the SQLite connection with Windows WAL concurrency pragmas.
 */
export function getSqliteClient(customPath?: string): DatabaseInstance {
  if (sqliteInstance && !customPath) {
    return sqliteInstance;
  }

  const dbPath = customPath || getDatabasePath();

  if (dbPath !== ':memory:') {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  const client = new Database(dbPath);

  // Configure critical PRAGMAs for Windows concurrency and safety
  client.pragma('journal_mode = WAL');
  client.pragma('busy_timeout = 5000');
  client.pragma('synchronous = NORMAL');
  client.pragma('foreign_keys = ON');

  if (!customPath) {
    sqliteInstance = client;
    logger.info(`SQLite database connected at: ${dbPath}`);
  }

  return client;
}

export const sqlite = getSqliteClient();
export const db = drizzle(sqlite, { schema });

/** Applies checked-in Drizzle migrations, including safe adoption of legacy databases. */
export function initDatabaseSchema(targetDb: ReturnType<typeof drizzle> = db): void {
  const client = (targetDb as any).session?.client as DatabaseInstance || sqlite;
  migrateDatabase(targetDb, client);
}
