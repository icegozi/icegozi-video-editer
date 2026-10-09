import Database, { Database as DatabaseInstance } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';
import { logger } from '../logging/logger';

let sqliteInstance: DatabaseInstance | null = null;

export function getDatabasePath(): string {
  if (process.env.ICEGOZI_DB_PATH) {
    return process.env.ICEGOZI_DB_PATH;
  }
  return path.resolve(process.cwd(), 'data', 'icegozi.sqlite');
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

/**
 * Executes embedded DDL directly to bootstrap tables without requiring CLI migrations.
 */
export function initDatabaseSchema(targetDb: ReturnType<typeof drizzle> = db): void {
  const client = (targetDb as any).session?.client as DatabaseInstance || sqlite;

  client.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Video',
      slug TEXT NOT NULL,
      width INTEGER NOT NULL DEFAULT 1920,
      height INTEGER NOT NULL DEFAULT 1080,
      fps INTEGER NOT NULL DEFAULT 30,
      duration_frames INTEGER NOT NULL DEFAULT 0,
      current_revision INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      last_edited_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL,
      change_summary TEXT,
      timeline_data TEXT NOT NULL,
      track_settings TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      UNIQUE(project_id, revision)
    );

    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      original_filename TEXT NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      media_type TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      file_hash_sha256 TEXT NOT NULL UNIQUE,
      metadata TEXT NOT NULL DEFAULT '{}',
      is_normalized INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_assets (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
      linked_at INTEGER NOT NULL,
      PRIMARY KEY (project_id, asset_id)
    );

    CREATE TABLE IF NOT EXISTS render_jobs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      snapshot_id TEXT NOT NULL REFERENCES project_snapshots(id) ON DELETE RESTRICT,
      profile TEXT NOT NULL DEFAULT 'preview',
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER NOT NULL DEFAULT 0,
      output_storage_key TEXT,
      download_url TEXT,
      error_message TEXT,
      render_metrics TEXT NOT NULL DEFAULT '{}',
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_project ON project_snapshots(project_id);
    CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status);
  `);
}

// Auto-bootstrap schema on load
initDatabaseSchema();
