import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { mediaAssets } from './assets';

export const generationPlans = sqliteTable(
  'generation_plans',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    projectId: text('project_id').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull(),
    payload: text('payload').notNull(),
  },
  (table) => [
    index('idx_generation_plans_owner').on(table.owner, table.projectId, table.createdAt),
  ],
);
export const generationJobs = sqliteTable(
  'generation_jobs',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id')
      .notNull()
      .unique()
      .references(() => generationPlans.id),
    owner: text('owner').notNull(),
    projectId: text('project_id').notNull(),
    status: text('status').notNull(),
    version: integer('version').notNull(),
    createdAt: integer('created_at').notNull(),
    payload: text('payload').notNull(),
  },
  (table) => [index('idx_generation_jobs_status').on(table.status)],
);
export const generationAssetGrants = sqliteTable(
  'generation_asset_grants',
  {
    owner: text('owner').notNull(),
    projectId: text('project_id').notNull(),
    assetId: text('asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    jobId: text('job_id')
      .notNull()
      .references(() => generationJobs.id),
    payload: text('payload').notNull(),
  },
  (table) => [primaryKey({ columns: [table.owner, table.projectId, table.assetId] })],
);
export const generationEvents = sqliteTable(
  'generation_events',
  {
    jobId: text('job_id')
      .notNull()
      .references(() => generationJobs.id),
    version: integer('version').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.jobId, table.version] })],
);
export const importedAssetGrants = sqliteTable(
  'imported_asset_grants',
  {
    owner: text('owner').notNull(),
    projectId: text('project_id').notNull(),
    assetId: text('asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    payload: text('payload').notNull(),
  },
  (table) => [primaryKey({ columns: [table.owner, table.projectId, table.assetId] })],
);
