CREATE TABLE `bot_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`eventType` varchar(48) NOT NULL,
	`summary` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bot_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_feature_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`antiLink` boolean NOT NULL DEFAULT false,
	`antiCall` boolean NOT NULL DEFAULT false,
	`autoRead` boolean NOT NULL DEFAULT false,
	`autoReact` boolean NOT NULL DEFAULT false,
	`groupControls` boolean NOT NULL DEFAULT false,
	`aiAutoReply` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_feature_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bot_feature_settings_profileId_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
CREATE TABLE `bot_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`botName` varchar(64) NOT NULL,
	`phoneE164` varchar(20) NOT NULL,
	`countryIso` varchar(2) NOT NULL,
	`countryDialCode` varchar(8) NOT NULL,
	`nationalNumber` varchar(32) NOT NULL,
	`connectionStatus` enum('draft','ready_to_pair','pairing','connected','disconnected','error') NOT NULL DEFAULT 'draft',
	`publicMode` boolean NOT NULL DEFAULT false,
	`commandPreferences` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `bot_activity` ADD CONSTRAINT `bot_activity_profileId_bot_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `bot_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bot_feature_settings` ADD CONSTRAINT `bot_feature_settings_profileId_bot_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `bot_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bot_profiles` ADD CONSTRAINT `bot_profiles_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;