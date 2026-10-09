import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { projects } from './projects';

/**
 * Registry of managed media assets on the local filesystem.
 */
export const mediaAssets = sqliteTable('media_assets', {
  id: text('id').primaryKey(),
  originalFilename: text('original_filename').notNull(),
  storageKey: text('storage_key').notNull().unique(),
  mimeType: text('mime_type').notNull(),
  mediaType: text('media_type').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  fileHashSha256: text('file_hash_sha256').notNull().unique(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  isNormalized: integer('is_normalized', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Junction table mapping media assets used within projects for safe deletion.
 */
export const projectAssets = sqliteTable(
  'project_assets',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    assetId: text('asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    linkedAt: integer('linked_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.assetId] }),
  ]
);
