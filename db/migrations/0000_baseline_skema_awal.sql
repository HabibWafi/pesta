CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`subjek` varchar(255) NOT NULL,
	`pesan` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'UNREAD',
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pengaduans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` varchar(255) NOT NULL,
	`jenis_kelamin` varchar(20),
	`no_hp` varchar(50),
	`email` varchar(255) NOT NULL,
	`asal_instansi` varchar(255),
	`kategori` varchar(100) NOT NULL,
	`detail` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'PENDING',
	`tanggapan` text,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `pengaduans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'ADMIN',
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_key` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vidcon_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` varchar(255) NOT NULL,
	`asal_instansi` varchar(255) NOT NULL,
	`alamat` text NOT NULL,
	`no_hp` varchar(50) NOT NULL,
	`email` varchar(255) NOT NULL,
	`cakupan` varchar(255) NOT NULL,
	`deskripsi` text NOT NULL,
	`tanggal` varchar(20) NOT NULL,
	`jam` varchar(10) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'PENDING',
	`catatan_admin` text,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `vidcon_requests_id` PRIMARY KEY(`id`)
);
