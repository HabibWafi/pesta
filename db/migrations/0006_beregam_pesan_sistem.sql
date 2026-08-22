CREATE TABLE `beregam_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kunci` varchar(60) NOT NULL,
	`nilai` text NOT NULL,
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `beregam_settings_kunci_key` UNIQUE(`kunci`)
);
