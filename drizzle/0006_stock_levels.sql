CREATE TABLE `stock_levels` (
	`product_id` text NOT NULL,
	`location` text NOT NULL,
	`color` text DEFAULT '' NOT NULL,
	`size` text DEFAULT '' NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`product_id`, `location`, `color`, `size`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`location` text NOT NULL,
	`color` text DEFAULT '' NOT NULL,
	`size` text DEFAULT '' NOT NULL,
	`change` integer NOT NULL,
	`quantity_after` integer NOT NULL,
	`reason` text NOT NULL,
	`order_id` text,
	`user_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `products` ADD `paused` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `low_stock_at` integer;--> statement-breakpoint
-- Products that already track stock keep it as one count at their branch (or the main shop).
INSERT INTO `stock_levels` (`product_id`, `location`, `color`, `size`, `quantity`)
SELECT `id`, COALESCE(`branch_id`, 'main'), '', '', MAX(`stock`, 0) FROM `products` WHERE `stock` IS NOT NULL;
