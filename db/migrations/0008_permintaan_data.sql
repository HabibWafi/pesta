CREATE TABLE `permintaan_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` varchar(255) NOT NULL,
	`asal_instansi` varchar(255) NOT NULL,
	`alamat` text NOT NULL,
	`no_hp` varchar(50) NOT NULL,
	`email` varchar(255) NOT NULL,
	`jenis_data` varchar(255) NOT NULL,
	`keperluan` text NOT NULL,
	`format_diinginkan` varchar(30) NOT NULL DEFAULT 'SOFT_FILE',
	`catatan` text,
	`status` varchar(20) NOT NULL DEFAULT 'PENDING',
	`catatan_admin` text,
	`sumber` varchar(20) NOT NULL DEFAULT 'WEB',
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `permintaan_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pengaduans` ADD `sumber` varchar(20) DEFAULT 'WEB' NOT NULL;--> statement-breakpoint
ALTER TABLE `vidcon_requests` ADD `sumber` varchar(20) DEFAULT 'WEB' NOT NULL;