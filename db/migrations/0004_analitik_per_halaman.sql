CREATE TABLE `analytics_path_daily` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tanggal` date NOT NULL,
	`path` varchar(190) NOT NULL,
	`views` int NOT NULL DEFAULT 0,
	`unique_visitors` int NOT NULL DEFAULT 0,
	`is_seeded` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `analytics_path_daily_id` PRIMARY KEY(`id`),
	CONSTRAINT `analytics_path_daily_key` UNIQUE(`tanggal`,`path`)
);
