// Vitest setup file: ensures test suite uses an isolated in-memory database
// and never touches or modifies production/user database files.
if (!process.env.ICEGOZI_DB_PATH) {
  process.env.ICEGOZI_DB_PATH = ':memory:';
}
