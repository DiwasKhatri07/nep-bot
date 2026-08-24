ALTER TABLE `bot_feature_settings` ADD `leaveMessage` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_feature_settings` ADD `antiLinkWarn` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_feature_settings` ADD `leaveMessage` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_feature_settings` ADD `privateAutoReply` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_feature_settings` ADD `statusView` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_profiles` ADD `language` enum('en','ne') DEFAULT 'ne' NOT NULL;
