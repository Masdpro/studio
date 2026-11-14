-- Service businesses are separate from product stores: one login can own one of each.
CREATE TABLE `service_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`business_name` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`tagline` text,
	`about` text,
	`contact_email` text NOT NULL,
	`phone` text NOT NULL,
	`street_address` text NOT NULL,
	`area` text NOT NULL,
	`city` text NOT NULL,
	`country` text DEFAULT 'Nigeria' NOT NULL,
	`image_url` text,
	`since` integer,
	`approval_status` text DEFAULT 'pending' NOT NULL,
	`approval_note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_providers_slug_idx` ON `service_providers` (`slug`);--> statement-breakpoint
CREATE TABLE `service_portfolio` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`image_url` text NOT NULL,
	`caption` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_portfolio_service_idx` ON `service_portfolio` (`service_id`);--> statement-breakpoint
ALTER TABLE `services` RENAME COLUMN `vendor_id` TO `provider_id`;--> statement-breakpoint
DROP INDEX `services_vendor_idx`;--> statement-breakpoint
CREATE INDEX `services_provider_idx` ON `services` (`provider_id`);--> statement-breakpoint
ALTER TABLE `service_settings` RENAME COLUMN `vendor_id` TO `provider_id`;--> statement-breakpoint
ALTER TABLE `bookings` RENAME COLUMN `vendor_id` TO `provider_id`;--> statement-breakpoint
ALTER TABLE `bookings` RENAME COLUMN `moved_by_vendor` TO `moved_by_provider`;--> statement-breakpoint
DROP INDEX `bookings_vendor_time_idx`;--> statement-breakpoint
CREATE INDEX `bookings_provider_time_idx` ON `bookings` (`provider_id`,`starts_at`);--> statement-breakpoint
-- Services added before this split belonged to a store: give each such store a service business of its own,
-- so those services and bookings keep working.
INSERT INTO `service_providers` (`id`, `business_name`, `slug`, `category`, `contact_email`, `phone`, `street_address`, `area`, `city`, `country`, `image_url`, `approval_status`, `created_at`)
SELECT v.`id`, v.`business_name`, 'p-' || lower(substr(v.`id`, 1, 12)), 'other', v.`contact_email`, v.`phone`, v.`street_address`, coalesce(v.`location_tag`, v.`city`), v.`city`, v.`country`, v.`image_url`, v.`approval_status`, CAST(strftime('%s','now') AS integer) * 1000
FROM `vendors` v
WHERE v.`id` IN (SELECT DISTINCT `provider_id` FROM `services`) AND v.`id` NOT IN (SELECT `id` FROM `service_providers`);
