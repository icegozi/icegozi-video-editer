CREATE TABLE IF NOT EXISTS `generation_asset_grants` (
	`owner` text NOT NULL,
	`project_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`job_id` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `project_id`, `asset_id`),
	FOREIGN KEY (`asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`job_id`) REFERENCES `generation_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `generation_events` (
	`job_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`job_id`, `version`),
	FOREIGN KEY (`job_id`) REFERENCES `generation_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`owner` text NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `generation_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `generation_jobs_plan_id_unique` ON `generation_jobs` (`plan_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_generation_jobs_status` ON `generation_jobs` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `generation_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_generation_plans_owner` ON `generation_plans` (`owner`,`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `imported_asset_grants` (
	`owner` text NOT NULL,
	`project_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `project_id`, `asset_id`),
	FOREIGN KEY (`asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_snapshots_project` ON `project_snapshots` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `project_snapshots_project_revision_unique` ON `project_snapshots` (`project_id`,`revision`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_render_jobs_status` ON `render_jobs` (`status`);
