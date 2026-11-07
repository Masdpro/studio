CREATE TABLE IF NOT EXISTS `bank_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`bank_code` text NOT NULL,
	`bank_name` text NOT NULL,
	`account_number` text NOT NULL,
	`account_name` text NOT NULL,
	`recipient_code` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`balance_after` real NOT NULL,
	`fee` real,
	`order_id` text,
	`description` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `withdrawals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` real NOT NULL,
	`fee` real NOT NULL,
	`net` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transfer_code` text,
	`failure_reason` text,
	`bank_name` text NOT NULL,
	`account_number` text NOT NULL,
	`account_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_code` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_code_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `wallet_transactions_user_created` ON `wallet_transactions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `withdrawals_user_created` ON `withdrawals` (`user_id`,`created_at`);
