import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../../src/infrastructure/db/migrations';

const clients: Database.Database[] = [];

function database(): Database.Database {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  clients.push(client);
  return client;
}

function tables(client: Database.Database): string[] {
  return client
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .pluck()
    .all() as string[];
}

function installLegacyBaseline(client: Database.Database): void {
  const sql = fs.readFileSync(
    path.resolve(process.cwd(), 'drizzle', '0000_special_expediter.sql'),
    'utf8',
  );
  for (const statement of sql.split('--> statement-breakpoint')) {
    if (statement.trim()) client.exec(statement);
  }
}

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

describe('database migrations', () => {
  it('creates the complete schema in a fresh database', () => {
    const client = database();
    migrateDatabase(drizzle(client), client);

    expect(tables(client)).toEqual(
      expect.arrayContaining([
        'projects',
        'project_snapshots',
        'media_assets',
        'render_jobs',
        'generation_plans',
        'generation_jobs',
      ]),
    );
    expect(
      client.prepare('SELECT COUNT(*) FROM __drizzle_migrations').pluck().get(),
    ).toBe(2);
  });

  it('adopts a legacy bootstrap and applies only additive migrations', () => {
    const client = database();
    installLegacyBaseline(client);

    migrateDatabase(drizzle(client), client);

    expect(tables(client)).toEqual(
      expect.arrayContaining(['generation_events', 'imported_asset_grants']),
    );
    expect(
      client.prepare('SELECT COUNT(*) FROM __drizzle_migrations').pluck().get(),
    ).toBe(2);
  });

  it('rejects a partial legacy schema instead of guessing', () => {
    const client = database();
    client.exec('CREATE TABLE projects (id TEXT PRIMARY KEY)');

    expect(() => migrateDatabase(drizzle(client), client)).toThrow(
      /partial legacy database/,
    );
  });
});
