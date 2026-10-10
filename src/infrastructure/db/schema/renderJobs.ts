import { index, sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { projects, projectSnapshots } from './projects';

/**
 * Persistent render jobs table tracking local Remotion render executions.
 */
export const renderJobs = sqliteTable(
  'render_jobs',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => projectSnapshots.id, { onDelete: 'restrict' }),
    profile: text('profile').notNull().default('preview'),
    status: text('status').notNull().default('queued'),
    progress: integer('progress').notNull().default(0),
    outputStorageKey: text('output_storage_key'),
    downloadUrl: text('download_url'),
    errorMessage: text('error_message'),
    renderMetrics: text('render_metrics', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    startedAt: integer('started_at'),
    completedAt: integer('completed_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('idx_render_jobs_status').on(table.status)],
);
