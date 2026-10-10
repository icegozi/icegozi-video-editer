import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export interface TimelineData {
  schemaVersion?: number;
  projectMetadata?: Record<string, unknown>;
  scenes: Array<Record<string, unknown>>;
  audioTracks?: Array<Record<string, unknown>>;
  subtitles?: Array<Record<string, unknown>>;
}

/**
 * Core table storing high-level video project metadata and configuration.
 */
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default('Untitled Video'),
  slug: text('slug').notNull(),
  width: integer('width').notNull().default(1920),
  height: integer('height').notNull().default(1080),
  fps: integer('fps').notNull().default(30),
  durationFrames: integer('duration_frames').notNull().default(0),
  currentRevision: integer('current_revision').notNull().default(1),
  status: text('status').notNull().default('active'),
  lastEditedAt: integer('last_edited_at').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Immutable snapshots storing the exact timeline state and revision history.
 */
export const projectSnapshots = sqliteTable('project_snapshots', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull(),
  changeSummary: text('change_summary'),
  timelineData: text('timeline_data', { mode: 'json' }).$type<TimelineData>().notNull(),
  trackSettings: text('track_settings', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  createdAt: integer('created_at').notNull(),
});
