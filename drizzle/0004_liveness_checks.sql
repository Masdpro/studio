CREATE TABLE `liveness_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`steps` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`frames` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`completed_at` integer
);
