// Vitest must never inherit a user or production database path from the shell.
process.env.ICEGOZI_DB_PATH = ':memory:';

const { initDatabaseSchema } = await import('../src/infrastructure/db/client');
initDatabaseSchema();

export {};
