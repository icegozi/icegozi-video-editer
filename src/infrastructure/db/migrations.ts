import type { Database as DatabaseInstance } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';

const BASELINE_MIGRATION_AT = 1791566028812;
const BASELINE_TABLES = [
  'projects',
  'project_snapshots',
  'media_assets',
  'project_assets',
  'render_jobs',
] as const;
const CURRENT_TABLES = [
  ...BASELINE_TABLES,
  'generation_plans',
  'generation_jobs',
  'generation_asset_grants',
  'generation_events',
  'imported_asset_grants',
] as const;

function tableNames(client: DatabaseInstance): Set<string> {
  const rows = client
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all() as Array<{ name: string }>;
  return new Set(rows.map((row) => row.name));
}

function assertNoDuplicateSnapshotRevisions(client: DatabaseInstance): void {
  const duplicate = client
    .prepare(
      `SELECT project_id, revision
       FROM project_snapshots
       GROUP BY project_id, revision
       HAVING COUNT(*) > 1
       LIMIT 1`,
    )
    .get() as { project_id: string; revision: number } | undefined;

  if (duplicate) {
    throw new Error(
      `Cannot migrate project_snapshots: duplicate revision ${duplicate.revision} exists for project ${duplicate.project_id}.`,
    );
  }
}

function adoptLegacyBootstrap(client: DatabaseInstance): void {
  const tables = tableNames(client);
  const existingBaseline = BASELINE_TABLES.filter((table) => tables.has(table));
  if (existingBaseline.length === 0) return;

  const missingBaseline = BASELINE_TABLES.filter((table) => !tables.has(table));
  if (missingBaseline.length > 0) {
    throw new Error(
      `Cannot migrate partial legacy database; missing tables: ${missingBaseline.join(', ')}.`,
    );
  }

  assertNoDuplicateSnapshotRevisions(client);
  client.exec(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )
  `);
  const migrationCount = client
    .prepare('SELECT COUNT(*) FROM "__drizzle_migrations"')
    .pluck()
    .get() as number;
  if (migrationCount === 0) {
    client
      .prepare(
        'INSERT INTO "__drizzle_migrations" (id, hash, created_at) VALUES (?, ?, ?)',
      )
      .run(1, 'legacy-embedded-bootstrap', BASELINE_MIGRATION_AT);
  }
}

export function migrateDatabase<TSchema extends Record<string, unknown>>(
  targetDb: BetterSQLite3Database<TSchema>,
  client: DatabaseInstance,
): void {
  adoptLegacyBootstrap(client);
  const migrationsFolder = path.join(
    path.resolve(process.env.ICEGOZI_APP_ROOT ?? process.cwd()),
    'drizzle',
  );
  if (!fs.existsSync(path.join(migrationsFolder, 'meta', '_journal.json'))) {
    throw new Error(`Database migrations not found at ${migrationsFolder}.`);
  }

  migrate(targetDb, { migrationsFolder });

  const tables = tableNames(client);
  const missing = CURRENT_TABLES.filter((table) => !tables.has(table));
  if (missing.length > 0) {
    throw new Error(`Database migration incomplete; missing tables: ${missing.join(', ')}.`);
  }
}
