CREATE TABLE `project_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`revision` integer NOT NULL,
	`change_summary` text,
	`timeline_data` text NOT NULL,
	`track_settings` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT 'Untitled Video' NOT NULL,
	`slug` text NOT NULL,
	`width` integer DEFAULT 1920 NOT NULL,
	`height` integer DEFAULT 1080 NOT NULL,
	`fps` integer DEFAULT 30 NOT NULL,
	`duration_frames` integer DEFAULT 0 NOT NULL,
	`current_revision` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_edited_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`original_filename` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`media_type` text NOT NULL,
	`file_size_bytes` integer NOT NULL,
	`file_hash_sha256` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`is_normalized` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_storage_key_unique` ON `media_assets` (`storage_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_file_hash_sha256_unique` ON `media_assets` (`file_hash_sha256`);--> statement-breakpoint
CREATE TABLE `project_assets` (
	`project_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`linked_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `asset_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `render_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`profile` text DEFAULT 'preview' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`output_storage_key` text,
	`download_url` text,
	`error_message` text,
	`render_metrics` text DEFAULT '{}' NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `project_snapshots`(`id`) ON UPDATE no action ON DELETE restrict
);
