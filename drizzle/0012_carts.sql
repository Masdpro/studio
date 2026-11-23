CREATE TABLE `carts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL
);
