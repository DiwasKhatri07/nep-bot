ALTER TABLE `bot_feature_settings` ADD `welcomeMessage` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_feature_settings` ADD `welcomeMessage` boolean DEFAULT false NOT NULL, ADD `commandAudit` boolean DEFAULT true NOT NULL;
