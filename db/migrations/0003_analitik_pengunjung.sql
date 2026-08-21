CREATE TABLE `analytics_daily` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tanggal` date NOT NULL,
	`views` int NOT NULL DEFAULT 0,
	`unique_visitors` int NOT NULL DEFAULT 0,
	`is_seeded` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `analytics_daily_id` PRIMARY KEY(`id`),
	CONSTRAINT `analytics_daily_tanggal_key` UNIQUE(`tanggal`)
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(190) NOT NULL,
	`referrer` varchar(190),
	`visitor_hash` varchar(64) NOT NULL,
	`device` varchar(20) NOT NULL,
	`browser` varchar(30) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `analytics_events_created_idx` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_hash_idx` ON `analytics_events` (`visitor_hash`);