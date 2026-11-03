CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text,
	`path` text,
	`product_id` text,
	`vendor_id` text,
	`term` text,
	`demo` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`street_address` text NOT NULL,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`vehicle_details` text,
	`image_url` text,
	`profile_managed` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `errand_quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`errand_request_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`estimated_item_cost` real NOT NULL,
	`delivery_fee` real NOT NULL,
	`total_estimated_cost` real NOT NULL,
	`agent_notes` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `errand_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`items_description` text NOT NULL,
	`preferred_store` text,
	`delivery_address` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`assigned_agent_id` text,
	`accepted_quote_id` text,
	`estimated_total_item_cost` real,
	`final_total_item_cost` real,
	`delivery_fee` real,
	`final_total_cost` real
);
--> statement-breakpoint
CREATE TABLE `markets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`location_tag` text NOT NULL,
	`image_url` text NOT NULL,
	`ai_hint` text,
	`is_trending` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	`read` integer DEFAULT false,
	`link` text,
	`icon_name` text,
	`category` text
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`items_json` text NOT NULL,
	`total_amount` real NOT NULL,
	`status` text NOT NULL,
	`pickup_address` text NOT NULL,
	`delivery_address` text NOT NULL,
	`delivery_fee` real NOT NULL,
	`estimated_distance` text,
	`created_at` integer NOT NULL,
	`delivery_agent_id` text,
	`delivery_preference` text NOT NULL,
	`agent_latitude` real,
	`agent_longitude` real,
	`agent_location_updated_at` integer,
	`branch_id` text
);
--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price` real NOT NULL,
	`discount_price` real,
	`image_url` text NOT NULL,
	`category` text,
	`ai_hint` text,
	`is_awoof` integer DEFAULT false,
	`branch_id` text,
	`gallery_json` text,
	`video_url` text,
	`colors_json` text,
	`sizes_json` text,
	`stock` integer
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`reviewee_type` text NOT NULL,
	`reviewee_id` text NOT NULL,
	`rating` text NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`display_name` text,
	`created_at` integer NOT NULL,
	`email_verified_at` integer,
	`phone` text,
	`phone_verified_at` integer,
	`approval_status` text DEFAULT 'approved' NOT NULL,
	`approval_note` text,
	`address` text,
	`session_version` integer DEFAULT 0 NOT NULL,
	`suspended_at` integer,
	`suspended_reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vendor_branches` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`name` text NOT NULL,
	`street_address` text NOT NULL,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`location_tag` text,
	`market_id` text,
	`latitude` real,
	`longitude` real,
	`phone` text,
	`operating_hours` text,
	`status` text DEFAULT 'Open',
	`created_at` integer NOT NULL,
	`image_url` text,
	`account_user_id` text
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` text PRIMARY KEY NOT NULL,
	`business_name` text NOT NULL,
	`contact_email` text NOT NULL,
	`phone` text NOT NULL,
	`street_address` text NOT NULL,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`location_tag` text,
	`market_id` text,
	`latitude` real,
	`longitude` real,
	`operating_hours` text,
	`status` text DEFAULT 'Open',
	`external_store_url` text,
	`image_url` text,
	`slug` text,
	`profile_managed` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`target` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'NGN' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_user_id_unique` ON `wallets` (`user_id`);