CREATE TABLE `beregam_ai_jobs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`contact_id` bigint,
	`channel` enum('wa','web') NOT NULL DEFAULT 'wa',
	`question` text NOT NULL,
	`intent` varchar(40),
	`mode` enum('embed','generate') NOT NULL DEFAULT 'embed',
	`context_used` json,
	`status` enum('pending','locked','done','failed') NOT NULL DEFAULT 'pending',
	`result` text,
	`score` decimal(5,4),
	`model` varchar(60),
	`latency_ms` int,
	`error` text,
	`locked_at` datetime(3),
	`locked_by` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_ai_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_alerts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`kode` varchar(60) NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'warning',
	`pesan` text NOT NULL,
	`meta` json,
	`first_seen_at` datetime(3),
	`last_seen_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`resolved_at` datetime(3),
	CONSTRAINT `beregam_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_contacts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`wa_id` varchar(64) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`name` varchar(120),
	`is_blocked` boolean NOT NULL DEFAULT false,
	`message_count` int NOT NULL DEFAULT 0,
	`first_seen_at` datetime(3),
	`last_seen_at` datetime(3),
	`opted_out_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `beregam_contacts_wa_id_key` UNIQUE(`wa_id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_faq` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menu_key` varchar(20),
	`parent_key` varchar(20),
	`title` varchar(150) NOT NULL,
	`answer` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_faq_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_handovers` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`contact_id` bigint NOT NULL,
	`channel` enum('wa','web') NOT NULL DEFAULT 'wa',
	`reason` varchar(150) NOT NULL,
	`status` enum('open','claimed','resolved') NOT NULL DEFAULT 'open',
	`assigned_to` int,
	`claimed_at` datetime(3),
	`resolved_at` datetime(3),
	`resolution_note` text,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_handovers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_health` (
	`id` tinyint NOT NULL,
	`worker_last_seen_at` datetime(3),
	`ai_worker_last_seen_at` datetime(3),
	`wa_session_status` varchar(30),
	`meta` json,
	`alerted_at` datetime(3),
	`maintenance_ran_at` datetime(3),
	`bot_enabled` boolean NOT NULL DEFAULT true,
	`active_worker_id` varchar(64),
	`lease_expires_at` datetime(3),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_health_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_holidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tanggal` date NOT NULL,
	`nama` varchar(150) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_holidays_id` PRIMARY KEY(`id`),
	CONSTRAINT `beregam_holidays_tanggal_key` UNIQUE(`tanggal`)
);
--> statement-breakpoint
CREATE TABLE `beregam_indikator` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode` varchar(40) NOT NULL,
	`nama` varchar(200) NOT NULL,
	`satuan` varchar(40),
	`wilayah_kode` varchar(20) NOT NULL,
	`wilayah_nama` varchar(100),
	`tahun` smallint NOT NULL,
	`periode` varchar(20),
	`nilai` decimal(20,4) NOT NULL,
	`sumber_publikasi` varchar(200) NOT NULL,
	`catatan` text,
	`verified_by` int,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_indikator_id` PRIMARY KEY(`id`),
	CONSTRAINT `beregam_indikator_key` UNIQUE(`kode`,`wilayah_kode`,`tahun`,`periode`)
);
--> statement-breakpoint
CREATE TABLE `beregam_kb` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(60),
	`source_type` enum('faq','publikasi','prosedur','regulasi'),
	`source_url` varchar(300),
	`source_ref` varchar(200),
	`content_hash` varchar(64),
	`is_active` boolean NOT NULL DEFAULT true,
	`indexed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_kb_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_kb_hits` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`kb_id` int,
	`question` text NOT NULL,
	`score` decimal(5,4),
	`was_used` boolean NOT NULL DEFAULT false,
	`channel` enum('wa','web') NOT NULL DEFAULT 'wa',
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_kb_hits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_messages` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`contact_id` bigint NOT NULL,
	`direction` enum('in','out') NOT NULL,
	`wa_message_id` varchar(120),
	`type` varchar(20) NOT NULL DEFAULT 'text',
	`body` text,
	`sent_by` int,
	`source` enum('bot','faq','semantic','sql','ai','agent','agent_phone'),
	`raw` json,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `beregam_messages_wa_message_key` UNIQUE(`wa_message_id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_outbox` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`contact_id` bigint NOT NULL,
	`wa_id` varchar(64) NOT NULL,
	`type` varchar(20) NOT NULL DEFAULT 'text',
	`payload` json NOT NULL,
	`status` enum('pending','locked','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`attempts` tinyint NOT NULL DEFAULT 0,
	`last_error` text,
	`locked_at` datetime(3),
	`locked_by` varchar(64),
	`scheduled_at` datetime(3),
	`sent_at` datetime(3),
	`sent_by` int,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_outbox_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_sessions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`contact_id` bigint NOT NULL,
	`state` varchar(50) NOT NULL DEFAULT 'idle',
	`mode` enum('bot','manual') NOT NULL DEFAULT 'bot',
	`context` json,
	`miss_count` tinyint NOT NULL DEFAULT 0,
	`last_activity_at` datetime(3),
	`expires_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `beregam_sessions_contact_key` UNIQUE(`contact_id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_sinonim` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jenis` enum('indikator','wilayah','periode') NOT NULL,
	`kata` varchar(100) NOT NULL,
	`kode_target` varchar(40) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_sinonim_id` PRIMARY KEY(`id`),
	CONSTRAINT `beregam_sinonim_key` UNIQUE(`jenis`,`kata`)
);
--> statement-breakpoint
ALTER TABLE `beregam_ai_jobs` ADD CONSTRAINT `beregam_ai_jobs_contact_id_beregam_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `beregam_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_handovers` ADD CONSTRAINT `beregam_handovers_contact_id_beregam_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `beregam_contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_handovers` ADD CONSTRAINT `beregam_handovers_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD CONSTRAINT `beregam_indikator_verified_by_users_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_kb_hits` ADD CONSTRAINT `beregam_kb_hits_kb_id_beregam_kb_id_fk` FOREIGN KEY (`kb_id`) REFERENCES `beregam_kb`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_messages` ADD CONSTRAINT `beregam_messages_contact_id_beregam_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `beregam_contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_messages` ADD CONSTRAINT `beregam_messages_sent_by_users_id_fk` FOREIGN KEY (`sent_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_outbox` ADD CONSTRAINT `beregam_outbox_contact_id_beregam_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `beregam_contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_outbox` ADD CONSTRAINT `beregam_outbox_sent_by_users_id_fk` FOREIGN KEY (`sent_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_sessions` ADD CONSTRAINT `beregam_sessions_contact_id_beregam_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `beregam_contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `beregam_ai_jobs_antrean_idx` ON `beregam_ai_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `beregam_alerts_kode_idx` ON `beregam_alerts` (`kode`,`resolved_at`);--> statement-breakpoint
CREATE INDEX `beregam_contacts_phone_idx` ON `beregam_contacts` (`phone`);--> statement-breakpoint
CREATE INDEX `beregam_faq_menu_idx` ON `beregam_faq` (`menu_key`);--> statement-breakpoint
CREATE INDEX `beregam_handovers_status_idx` ON `beregam_handovers` (`status`);--> statement-breakpoint
CREATE INDEX `beregam_indikator_kode_idx` ON `beregam_indikator` (`kode`);--> statement-breakpoint
CREATE INDEX `beregam_indikator_wilayah_idx` ON `beregam_indikator` (`wilayah_kode`);--> statement-breakpoint
CREATE INDEX `beregam_indikator_tahun_idx` ON `beregam_indikator` (`tahun`);--> statement-breakpoint
CREATE INDEX `beregam_kb_hash_idx` ON `beregam_kb` (`content_hash`);--> statement-breakpoint
CREATE INDEX `beregam_messages_contact_idx` ON `beregam_messages` (`contact_id`,`id`);--> statement-breakpoint
CREATE INDEX `beregam_messages_rate_idx` ON `beregam_messages` (`contact_id`,`direction`,`created_at`);--> statement-breakpoint
CREATE INDEX `beregam_outbox_antrean_idx` ON `beregam_outbox` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `beregam_sessions_mode_idx` ON `beregam_sessions` (`mode`);--> statement-breakpoint
CREATE INDEX `beregam_sessions_expires_idx` ON `beregam_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `beregam_sinonim_kata_idx` ON `beregam_sinonim` (`kata`);