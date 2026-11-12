CREATE TABLE `system_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL,
	`level` text NOT NULL,
	`area` text NOT NULL,
	`message` text NOT NULL,
	`details` text,
	`request_id` text
);
--> statement-breakpoint
CREATE INDEX `system_events_at_idx` ON `system_events` (`at`);