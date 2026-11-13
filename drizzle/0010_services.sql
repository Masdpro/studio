CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`service_name` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`location` text NOT NULL,
	`address` text,
	`note` text,
	`price` real NOT NULL,
	`call_out_fee` real DEFAULT 0 NOT NULL,
	`total` real NOT NULL,
	`status` text NOT NULL,
	`respond_by` integer,
	`completion_code` text NOT NULL,
	`code_attempts` integer DEFAULT 0 NOT NULL,
	`moved_by_vendor` integer DEFAULT false NOT NULL,
	`reminded_day` integer DEFAULT false NOT NULL,
	`reminded_hour` integer DEFAULT false NOT NULL,
	`cancelled_by` text,
	`cancel_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookings_vendor_time_idx` ON `bookings` (`vendor_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `bookings_customer_idx` ON `bookings` (`customer_id`);--> statement-breakpoint
CREATE INDEX `bookings_status_idx` ON `bookings` (`status`);--> statement-breakpoint
CREATE TABLE `service_settings` (
	`vendor_id` text PRIMARY KEY NOT NULL,
	`weekly_hours` text NOT NULL,
	`capacity` integer DEFAULT 1 NOT NULL,
	`instant_booking` integer DEFAULT true NOT NULL,
	`days_off` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`image_url` text,
	`price` real NOT NULL,
	`price_from` integer DEFAULT false NOT NULL,
	`duration_min` integer NOT NULL,
	`location` text DEFAULT 'shop' NOT NULL,
	`call_out_fee` real,
	`paused` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `services_vendor_idx` ON `services` (`vendor_id`);