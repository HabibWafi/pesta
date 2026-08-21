CREATE TABLE `faqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pertanyaan` varchar(255) NOT NULL,
	`jawaban` text NOT NULL,
	`kategori` varchar(60),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_published` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(80) NOT NULL,
	`setting_value` text,
	`grup` varchar(40) NOT NULL DEFAULT 'umum',
	`updated_by` int,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_key_key` UNIQUE(`setting_key`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` varchar(150) NOT NULL,
	`peran` varchar(150),
	`instansi` varchar(150),
	`pesan` text NOT NULL,
	`rating` tinyint NOT NULL DEFAULT 5,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_published` boolean NOT NULL DEFAULT false,
	`source_note` text,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
