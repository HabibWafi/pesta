CREATE TABLE `beregam_penilaian` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`contact_id` bigint NOT NULL,
	`handover_id` bigint,
	`skor` tinyint NOT NULL,
	`komentar` text,
	`ditangani_oleh` int,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_penilaian_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `beregam_penilaian` ADD CONSTRAINT `beregam_penilaian_contact_id_beregam_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `beregam_contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_penilaian` ADD CONSTRAINT `beregam_penilaian_handover_id_beregam_handovers_id_fk` FOREIGN KEY (`handover_id`) REFERENCES `beregam_handovers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beregam_penilaian` ADD CONSTRAINT `beregam_penilaian_ditangani_oleh_users_id_fk` FOREIGN KEY (`ditangani_oleh`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `beregam_penilaian_waktu_idx` ON `beregam_penilaian` (`created_at`);--> statement-breakpoint
CREATE INDEX `beregam_penilaian_kontak_idx` ON `beregam_penilaian` (`contact_id`);