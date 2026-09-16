CREATE TABLE `beregam_datasets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode` varchar(40) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`nama` varchar(200) NOT NULL,
	`tema` varchar(60) NOT NULL,
	`definisi` text,
	`satuan` varchar(40),
	`source_type` enum('dynamic','simdasi','manual') NOT NULL DEFAULT 'dynamic',
	`source_ref` varchar(191),
	`source_config` json,
	`source_url` varchar(300),
	`default_view` enum('number','line','bar','stacked','composition','map') NOT NULL DEFAULT 'line',
	`is_featured` boolean NOT NULL DEFAULT false,
	`featured_order` int NOT NULL DEFAULT 0,
	`highlight_title` varchar(160),
	`highlight_note` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`sync_enabled` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_datasets_id` PRIMARY KEY(`id`),
	CONSTRAINT `beregam_datasets_kode_key` UNIQUE(`kode`),
	CONSTRAINT `beregam_datasets_slug_key` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `beregam_dataset_versions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`dataset_id` int NOT NULL,
	`status` enum('draft','published','archived','rejected') NOT NULL DEFAULT 'draft',
	`content_hash` varchar(64) NOT NULL,
	`source_updated_at` datetime(3),
	`fetched_at` datetime(3) NOT NULL,
	`reviewed_at` datetime(3),
	`reviewed_by` int,
	`review_note` text,
	`summary` json,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_dataset_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `beregam_dataset_versions_hash_key` UNIQUE(`dataset_id`,`content_hash`)
);
--> statement-breakpoint
CREATE TABLE `beregam_sync_runs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`trigger` enum('heartbeat','admin') NOT NULL,
	`status` enum('running','done','partial','failed') NOT NULL DEFAULT 'running',
	`requested_by` int,
	`datasets_checked` int NOT NULL DEFAULT 0,
	`drafts_created` int NOT NULL DEFAULT 0,
	`error` text,
	`started_at` datetime(3) NOT NULL,
	`finished_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_sync_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beregam_data_audit` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`dataset_id` int,
	`version_id` bigint,
	`action` varchar(40) NOT NULL,
	`actor_id` int,
	`before` json,
	`after` json,
	`note` text,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `beregam_data_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD `dataset_id` int;
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD `version_id` bigint;
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD `wilayah_level` enum('kabupaten','kecamatan','desa') NOT NULL DEFAULT 'kabupaten';
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD `periode_kode` varchar(40);
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD `dimensi` json;
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD `dimensi_hash` varchar(64);
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD `source_ref` varchar(191);
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD `source_url` varchar(300);
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD `source_updated_at` datetime(3);
--> statement-breakpoint
INSERT INTO `beregam_datasets`
	(`kode`,`slug`,`nama`,`tema`,`satuan`,`source_type`,`source_ref`,`source_url`,`default_view`,`is_active`,`sync_enabled`)
SELECT `kode`, LOWER(REPLACE(`kode`, '_', '-')), MAX(`nama`), 'Data Lama', MAX(`satuan`), 'manual', 'legacy', NULL, 'line', true, false
FROM `beregam_indikator`
GROUP BY `kode`;
--> statement-breakpoint
INSERT INTO `beregam_dataset_versions`
	(`dataset_id`,`status`,`content_hash`,`fetched_at`,`reviewed_at`,`review_note`,`summary`)
SELECT d.id, 'published', SHA2(CONCAT('legacy:', d.id), 256), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3),
	'Migrasi otomatis data indikator lama', JSON_OBJECT('observations', COUNT(i.id), 'added', COUNT(i.id), 'changed', 0, 'removed', 0)
FROM `beregam_datasets` d
JOIN `beregam_indikator` i ON i.kode = d.kode
GROUP BY d.id;
--> statement-breakpoint
UPDATE `beregam_indikator` i
JOIN `beregam_datasets` d ON d.kode = i.kode
JOIN `beregam_dataset_versions` v ON v.dataset_id = d.id AND v.status = 'published'
SET i.dataset_id = d.id,
	i.version_id = v.id,
	i.periode_kode = COALESCE(NULLIF(i.periode, ''), CAST(i.tahun AS CHAR)),
	i.dimensi = JSON_OBJECT(),
	i.dimensi_hash = SHA2('{}', 256),
	i.source_ref = 'legacy';
--> statement-breakpoint
ALTER TABLE `beregam_indikator` MODIFY `dataset_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `beregam_indikator` MODIFY `version_id` bigint NOT NULL;
--> statement-breakpoint
ALTER TABLE `beregam_indikator` MODIFY `periode_kode` varchar(40) NOT NULL;
--> statement-breakpoint
ALTER TABLE `beregam_indikator` MODIFY `dimensi_hash` varchar(64) NOT NULL;
--> statement-breakpoint
ALTER TABLE `beregam_indikator` DROP INDEX `beregam_indikator_key`;
--> statement-breakpoint
ALTER TABLE `beregam_dataset_versions` ADD CONSTRAINT `beregam_dataset_versions_dataset_id_beregam_datasets_id_fk` FOREIGN KEY (`dataset_id`) REFERENCES `beregam_datasets`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `beregam_dataset_versions` ADD CONSTRAINT `beregam_dataset_versions_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `beregam_sync_runs` ADD CONSTRAINT `beregam_sync_runs_requested_by_users_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `beregam_data_audit` ADD CONSTRAINT `beregam_data_audit_dataset_id_beregam_datasets_id_fk` FOREIGN KEY (`dataset_id`) REFERENCES `beregam_datasets`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `beregam_data_audit` ADD CONSTRAINT `beregam_data_audit_version_id_beregam_dataset_versions_id_fk` FOREIGN KEY (`version_id`) REFERENCES `beregam_dataset_versions`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `beregam_data_audit` ADD CONSTRAINT `beregam_data_audit_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD CONSTRAINT `beregam_indikator_dataset_id_beregam_datasets_id_fk` FOREIGN KEY (`dataset_id`) REFERENCES `beregam_datasets`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `beregam_indikator` ADD CONSTRAINT `beregam_indikator_version_id_beregam_dataset_versions_id_fk` FOREIGN KEY (`version_id`) REFERENCES `beregam_dataset_versions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `beregam_datasets_tema_idx` ON `beregam_datasets` (`tema`,`is_active`);
--> statement-breakpoint
CREATE INDEX `beregam_datasets_featured_idx` ON `beregam_datasets` (`is_featured`,`featured_order`);
--> statement-breakpoint
CREATE INDEX `beregam_dataset_versions_status_idx` ON `beregam_dataset_versions` (`dataset_id`,`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `beregam_sync_runs_started_idx` ON `beregam_sync_runs` (`started_at`,`status`);
--> statement-breakpoint
CREATE INDEX `beregam_data_audit_dataset_idx` ON `beregam_data_audit` (`dataset_id`,`created_at`);
--> statement-breakpoint
DROP INDEX `beregam_indikator_kode_idx` ON `beregam_indikator`;
--> statement-breakpoint
DROP INDEX `beregam_indikator_wilayah_idx` ON `beregam_indikator`;
--> statement-breakpoint
DROP INDEX `beregam_indikator_tahun_idx` ON `beregam_indikator`;
--> statement-breakpoint
CREATE UNIQUE INDEX `beregam_indikator_observasi_key` ON `beregam_indikator` (`dataset_id`,`version_id`,`wilayah_kode`,`periode_kode`,`dimensi_hash`);
--> statement-breakpoint
CREATE INDEX `beregam_indikator_kode_idx` ON `beregam_indikator` (`kode`,`version_id`);
--> statement-breakpoint
CREATE INDEX `beregam_indikator_wilayah_idx` ON `beregam_indikator` (`wilayah_kode`,`wilayah_level`);
--> statement-breakpoint
CREATE INDEX `beregam_indikator_tahun_idx` ON `beregam_indikator` (`tahun`,`periode_kode`);
--> statement-breakpoint
INSERT IGNORE INTO `beregam_datasets`
	(`kode`,`slug`,`nama`,`tema`,`satuan`,`source_type`,`default_view`,`is_featured`,`featured_order`,`is_active`,`sync_enabled`)
VALUES
	('PENDUDUK_TOTAL','jumlah-penduduk','Jumlah Penduduk','Kependudukan','Jiwa','dynamic','line',true,1,true,false),
	('PENDUDUK_TUMBUH','pertumbuhan-penduduk','Laju Pertumbuhan Penduduk','Kependudukan','Persen','dynamic','line',false,2,true,false),
	('PENDUDUK_PADAT','kepadatan-penduduk','Kepadatan Penduduk','Kependudukan','Jiwa/km2','dynamic','map',true,3,true,false),
	('RASIO_JK','rasio-jenis-kelamin','Rasio Jenis Kelamin','Kependudukan',NULL,'dynamic','bar',false,4,true,false),
	('MISKIN_TOTAL','jumlah-penduduk-miskin','Jumlah Penduduk Miskin','Kemiskinan','Ribu jiwa','dynamic','line',false,5,true,false),
	('MISKIN_PERSEN','persentase-penduduk-miskin','Persentase Penduduk Miskin','Kemiskinan','Persen','dynamic','line',true,6,true,false),
	('GARIS_MISKIN','garis-kemiskinan','Garis Kemiskinan','Kemiskinan','Rupiah/kapita/bulan','dynamic','line',false,7,true,false),
	('INDEKS_P1','indeks-kedalaman-kemiskinan','Indeks Kedalaman Kemiskinan (P1)','Kemiskinan',NULL,'dynamic','line',false,8,true,false),
	('INDEKS_P2','indeks-keparahan-kemiskinan','Indeks Keparahan Kemiskinan (P2)','Kemiskinan',NULL,'dynamic','line',false,9,true,false),
	('IPM','indeks-pembangunan-manusia','Indeks Pembangunan Manusia','Pembangunan Manusia',NULL,'dynamic','line',true,10,true,false),
	('UHH','umur-harapan-hidup','Umur Harapan Hidup Saat Lahir','Pembangunan Manusia','Tahun','dynamic','line',false,11,true,false),
	('HLS','harapan-lama-sekolah','Harapan Lama Sekolah','Pembangunan Manusia','Tahun','dynamic','line',false,12,true,false),
	('RLS','rata-rata-lama-sekolah','Rata-rata Lama Sekolah','Pembangunan Manusia','Tahun','dynamic','line',false,13,true,false),
	('PENGELUARAN_IPM','pengeluaran-per-kapita-disesuaikan','Pengeluaran Riil per Kapita Disesuaikan','Pembangunan Manusia','Ribu rupiah/orang/tahun','dynamic','line',false,14,true,false),
	('TPAK','tingkat-partisipasi-angkatan-kerja','Tingkat Partisipasi Angkatan Kerja','Ketenagakerjaan','Persen','dynamic','line',false,15,true,false),
	('TPT','tingkat-pengangguran-terbuka','Tingkat Pengangguran Terbuka','Ketenagakerjaan','Persen','dynamic','line',true,16,true,false),
	('PDRB_ADHB','pdrb-adhb','PDRB Atas Dasar Harga Berlaku','Ekonomi','Miliar rupiah','dynamic','line',false,17,true,false),
	('PDRB_ADHK','pdrb-adhk','PDRB Atas Dasar Harga Konstan','Ekonomi','Miliar rupiah','dynamic','line',false,18,true,false),
	('PDRB_TUMBUH','pertumbuhan-ekonomi','Laju Pertumbuhan PDRB','Ekonomi','Persen','dynamic','line',true,19,true,false),
	('PDRB_KAPITA','pdrb-per-kapita','PDRB per Kapita','Ekonomi','Ribu rupiah','dynamic','line',false,20,true,false),
	('PADI_LUAS_PANEN','luas-panen-padi','Luas Panen Padi','Pertanian','Hektare','dynamic','bar',false,21,true,false),
	('PADI_PRODUKSI','produksi-padi','Produksi Padi','Pertanian','Ton','dynamic','bar',true,22,true,false),
	('PADI_PRODUKTIVITAS','produktivitas-padi','Produktivitas Padi','Pertanian','Ku/ha','dynamic','bar',false,23,true,false);
