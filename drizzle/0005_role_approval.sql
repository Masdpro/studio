ALTER TABLE `delivery_agents` ADD `approval_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_agents` ADD `approval_note` text;--> statement-breakpoint
ALTER TABLE `vendors` ADD `approval_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `approval_note` text;--> statement-breakpoint
-- Each role starts with the approval its account had.
UPDATE `vendors` SET `approval_status` = COALESCE((SELECT `approval_status` FROM `users` WHERE `users`.`id` = `vendors`.`id`), 'pending'), `approval_note` = (SELECT `approval_note` FROM `users` WHERE `users`.`id` = `vendors`.`id`);--> statement-breakpoint
UPDATE `delivery_agents` SET `approval_status` = COALESCE((SELECT `approval_status` FROM `users` WHERE `users`.`id` = `delivery_agents`.`id`), 'pending'), `approval_note` = (SELECT `approval_note` FROM `users` WHERE `users`.`id` = `delivery_agents`.`id`);--> statement-breakpoint
-- Accounts with both roles were approved once, for whichever role came first. The other role was
-- never reviewed: send it back to the queue. A role counts as the later one when its documents are
-- missing or were uploaded after the other role's.
UPDATE `delivery_agents` SET `approval_status` = 'pending', `approval_note` = NULL
WHERE `approval_status` = 'approved' AND `id` IN (SELECT `id` FROM `vendors`) AND (
  NOT EXISTS (SELECT 1 FROM `verification_documents` d WHERE d.`user_id` = `delivery_agents`.`id` AND d.`kind` = 'government_id')
  OR NOT EXISTS (SELECT 1 FROM `verification_documents` d WHERE d.`user_id` = `delivery_agents`.`id` AND d.`kind` = 'selfie')
  OR (SELECT MIN(d.`created_at`) FROM `verification_documents` d WHERE d.`user_id` = `delivery_agents`.`id` AND d.`kind` IN ('government_id', 'selfie'))
     > COALESCE((SELECT MIN(d.`created_at`) FROM `verification_documents` d WHERE d.`user_id` = `delivery_agents`.`id` AND d.`kind` IN ('business_proof', 'store_photo')), 0)
);--> statement-breakpoint
UPDATE `vendors` SET `approval_status` = 'pending', `approval_note` = NULL
WHERE `approval_status` = 'approved' AND `id` IN (SELECT `id` FROM `delivery_agents` WHERE `approval_status` = 'approved') AND (
  NOT EXISTS (SELECT 1 FROM `verification_documents` d WHERE d.`user_id` = `vendors`.`id` AND d.`kind` = 'business_proof')
  OR NOT EXISTS (SELECT 1 FROM `verification_documents` d WHERE d.`user_id` = `vendors`.`id` AND d.`kind` = 'store_photo')
  OR (SELECT MIN(d.`created_at`) FROM `verification_documents` d WHERE d.`user_id` = `vendors`.`id` AND d.`kind` IN ('business_proof', 'store_photo'))
     > COALESCE((SELECT MIN(d.`created_at`) FROM `verification_documents` d WHERE d.`user_id` = `vendors`.`id` AND d.`kind` IN ('government_id', 'selfie')), 0)
);--> statement-breakpoint
-- The account summary is approved only when every role is.
UPDATE `users` SET `approval_status` = 'pending'
WHERE `approval_status` = 'approved' AND (`id` IN (SELECT `id` FROM `vendors` WHERE `approval_status` = 'pending') OR `id` IN (SELECT `id` FROM `delivery_agents` WHERE `approval_status` = 'pending'));
