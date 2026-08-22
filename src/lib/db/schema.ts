import {
  mysqlTable,
  int,
  tinyint,
  boolean,
  varchar,
  text,
  datetime,
  json,
  date,
  index,
  unique,
  customType,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

/**
 * LONGBLOB - drizzle-orm 0.45 belum menyediakan helper bawaan untuk ini
 * (hanya `binary`/`varbinary` yang panjangnya wajib dipatok kecil, maksimal
 * 65.535 byte gabungan per baris - terlalu kecil untuk lampiran PDF/Word/
 * Excel). `customType` memetakannya langsung ke Buffer Node, sama seperti
 * cara mysql2 mengembalikan kolom BLOB apa pun.
 */
const longblob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "longblob";
  },
});

/**
 * Skema database PESTA (Drizzle ORM, dialek MySQL).
 *
 * Nama tabel dan kolom di database memakai snake_case; properti di kode
 * memakai camelCase. Pemetaannya ditulis eksplisit supaya tidak ada tebakan.
 *
 * CATATAN WAKTU - jangan diubah tanpa membaca ini dulu:
 * Semua kolom waktu disimpan dalam UTC. Database memang punya
 * DEFAULT CURRENT_TIMESTAMP(3) dan ON UPDATE CURRENT_TIMESTAMP(3), tetapi
 * kode SELALU mengisi createdAt/updatedAt secara eksplisit dengan `new Date()`.
 *
 * Alasannya: CURRENT_TIMESTAMP memakai zona waktu server MySQL. Di komputer
 * pengembangan (Laragon) zona itu WIB, sementara di Hostinger kemungkinan UTC.
 * Membiarkan database yang mengisi berarti waktu tersimpan bergeser 7 jam
 * tergantung mesin mana yang menjalankannya - dan pergeseran itu tidak akan
 * terlihat sampai ada yang menghitung laporan bulanan.
 *
 * Pool koneksi di ./index.ts diatur `timezone: "Z"` supaya JS Date <-> DATETIME
 * selalu diterjemahkan sebagai UTC. Konversi ke WIB hanya di batas tampilan.
 */

/**
 * Waktu dibuat. Default SQL disimpan agar DDL hasil `drizzle-kit generate`
 * tetap sama dengan tabel yang sudah ada di produksi, tetapi nilainya selalu
 * dipasok kode lewat $defaultFn supaya yang tersimpan pasti UTC.
 */
const createdAt = () =>
  datetime("created_at", { mode: "date", fsp: 3 })
    .default(sql`(CURRENT_TIMESTAMP(3))`)
    .$defaultFn(() => new Date())
    .notNull();

/**
 * Waktu diubah. $onUpdate menjalankan hook di sisi aplikasi setiap kali baris
 * di-update, jadi nilainya berasal dari Node (UTC) - bukan dari
 * ON UPDATE CURRENT_TIMESTAMP milik MySQL yang memakai zona waktu server.
 */
const updatedAt = () =>
  datetime("updated_at", { mode: "date", fsp: 3 })
    .default(sql`(CURRENT_TIMESTAMP(3))`)
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull();

// ---------------------------------------------------------------------------
// 1. Pengguna / Administrator BPS
// ---------------------------------------------------------------------------
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    /** Hash bcrypt. Jangan pernah menyimpan password polos. */
    password: varchar("password", { length: 255 }).notNull(),
    /** ADMIN | SUPERADMIN */
    role: varchar("role", { length: 50 }).default("ADMIN").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("users_email_key").on(t.email)]
);

// ---------------------------------------------------------------------------
// 2. Permohonan ViDCon (Virtual Data Consultation)
// ---------------------------------------------------------------------------
export const vidconRequests = mysqlTable("vidcon_requests", {
  id: int("id").autoincrement().primaryKey(),
  nama: varchar("nama", { length: 255 }).notNull(),
  asalInstansi: varchar("asal_instansi", { length: 255 }).notNull(),
  alamat: text("alamat").notNull(),
  noHp: varchar("no_hp", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  /** Cakupan/topik konsultasi, mis. "Data Perekonomian & PDRB" */
  cakupan: varchar("cakupan", { length: 255 }).notNull(),
  deskripsi: text("deskripsi").notNull(),
  /** YYYY-MM-DD (disimpan sebagai teks, bukan tipe DATE) */
  tanggal: varchar("tanggal", { length: 20 }).notNull(),
  /** HH:mm */
  jam: varchar("jam", { length: 10 }).notNull(),
  /** PENDING | APPROVED | REJECTED | COMPLETED */
  status: varchar("status", { length: 20 }).default("PENDING").notNull(),
  catatanAdmin: text("catatan_admin"),

  /**
   * Kebutuhan pendampingan inklusif, disimpan sebagai array JSON.
   *
   * Array karena UU No. 8/2016 Pasal 4 menyatakan disabilitas bisa dialami
   * tunggal, ganda, atau multi - satu warga bisa butuh lebih dari satu
   * bentuk pendampingan sekaligus. Daftar nilainya di src/lib/schemas/inklusi.ts
   */
  layananInklusif: json("layanan_inklusif").$type<string[]>(),
  /** Penjelasan bebas bila memilih LAINNYA. */
  layananInklusifCatatan: text("layanan_inklusif_catatan"),

  /**
   * Kanal masuknya permohonan: WEB | WHATSAPP.
   *
   * Beregam (bot WhatsApp) mengisi tabel yang sama persis dengan formulir
   * web - satu antrean kerja bagi petugas, bukan dua. Kolom ini semata
   * penanda asal, tidak memengaruhi cara permohonan diproses.
   */
  sumber: varchar("sumber", { length: 20 }).default("WEB").notNull(),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// 3. Aduan publik (kanal internal PESTA)
// ---------------------------------------------------------------------------
export const pengaduans = mysqlTable("pengaduans", {
  id: int("id").autoincrement().primaryKey(),
  /** Nama pelapor, atau "Anonim" */
  nama: varchar("nama", { length: 255 }).notNull(),
  jenisKelamin: varchar("jenis_kelamin", { length: 20 }),
  noHp: varchar("no_hp", { length: 50 }),
  email: varchar("email", { length: 255 }).notNull(),
  asalInstansi: varchar("asal_instansi", { length: 255 }),
  kategori: varchar("kategori", { length: 100 }).notNull(),
  detail: text("detail").notNull(),
  /** PENDING | IN_PROGRESS | RESOLVED */
  status: varchar("status", { length: 20 }).default("PENDING").notNull(),
  /** Balasan atau tindak lanjut petugas BPS */
  tanggapan: text("tanggapan"),
  /** Kanal masuknya aduan: WEB | WHATSAPP. Lihat catatan di vidconRequests. */
  sumber: varchar("sumber", { length: 20 }).default("WEB").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// 3b. Permintaan data statistik ke kantor
//
// Berbeda dari ViDCon (konsultasi/diskusi terjadwal) dan dari tautan keluar
// ke portal BPS Pusat/SILASTIK (menjelajah publikasi yang sudah terbit) -
// ini permohonan DATA SPESIFIK yang belum tentu tersedia di publikasi, dan
// harus diproses satu per satu oleh petugas PST.
// ---------------------------------------------------------------------------
export const permintaanData = mysqlTable("permintaan_data", {
  id: int("id").autoincrement().primaryKey(),
  nama: varchar("nama", { length: 255 }).notNull(),
  asalInstansi: varchar("asal_instansi", { length: 255 }).notNull(),
  alamat: text("alamat").notNull(),
  noHp: varchar("no_hp", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  /** Data/tabel apa yang diminta, mis. "PDRB per kecamatan 2023" */
  jenisData: varchar("jenis_data", { length: 255 }).notNull(),
  /** Untuk keperluan apa data ini akan dipakai */
  keperluan: text("keperluan").notNull(),
  /** SOFT_FILE | HARD_COPY | KUNJUNGAN_LANGSUNG */
  formatDiinginkan: varchar("format_diinginkan", { length: 30 })
    .default("SOFT_FILE")
    .notNull(),
  catatan: text("catatan"),
  /** PENDING | DIPROSES | SELESAI | DITOLAK */
  status: varchar("status", { length: 20 }).default("PENDING").notNull(),
  catatanAdmin: text("catatan_admin"),
  /** Kanal masuknya permintaan: WEB | WHATSAPP. */
  sumber: varchar("sumber", { length: 20 }).default("WEB").notNull(),

  /**
   * Lampiran pendukung, opsional - mis. contoh format tabel yang diminta,
   * daftar variabel, atau surat pengantar instansi. Hanya dari jalur WEB;
   * webhook WhatsApp sengaja tidak pernah mengunduh media (lihat catatan
   * di src/app/api/beregam/webhook/route.ts - kuota disk Hostinger terbatas).
   * Disimpan di database, bukan filesystem, supaya ikut tercakup backup
   * mingguan yang sudah ada (`npm run db:backup`) tanpa jalur cadangan baru.
   */
  lampiranNama: varchar("lampiran_nama", { length: 255 }),
  lampiranTipe: varchar("lampiran_tipe", { length: 150 }),
  lampiranUkuran: int("lampiran_ukuran"),
  lampiranData: longblob("lampiran_data"),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// 4. Pesan kontak cepat ke PST
// ---------------------------------------------------------------------------
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  nama: varchar("nama", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subjek: varchar("subjek", { length: 255 }).notNull(),
  pesan: text("pesan").notNull(),
  /** UNREAD | READ | REPLIED */
  status: varchar("status", { length: 20 }).default("UNREAD").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});


// ---------------------------------------------------------------------------
// 5. Pengaturan situs (key/value)
//
// Menampung isi yang berubah-ubah: alamat kantor, telepon, jam layanan,
// koordinat peta, saklar tampil tiap bagian landing, dan label istilah.
// Tujuannya satu: konten yang berubah-ubah tidak boleh butuh deploy.
// ---------------------------------------------------------------------------
export const siteSettings = mysqlTable(
  "site_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Kunci pengaturan, mis. "kontak.alamat" atau "peta.lat" */
    key: varchar("setting_key", { length: 80 }).notNull(),
    value: text("setting_value"),
    /** Pengelompokan untuk tampilan admin: kontak | peta | tampilan | istilah */
    grup: varchar("grup", { length: 40 }).default("umum").notNull(),
    /** Siapa yang terakhir mengubah - berguna saat menelusuri perubahan. */
    updatedBy: int("updated_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("site_settings_key_key").on(t.key)]
);

// ---------------------------------------------------------------------------
// 6. Testimoni pengguna layanan
//
// Ditampilkan di landing hanya bila isPublished true DAN saklar bagian
// testimoni dinyalakan lewat site_settings.
// ---------------------------------------------------------------------------
export const testimonials = mysqlTable("testimonials", {
  id: int("id").autoincrement().primaryKey(),
  nama: varchar("nama", { length: 150 }).notNull(),
  peran: varchar("peran", { length: 150 }),
  instansi: varchar("instansi", { length: 150 }),
  pesan: text("pesan").notNull(),
  rating: tinyint("rating").default(5).notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  /**
   * Dari mana testimoni ini berasal - surat, wawancara, formulir kepuasan.
   *
   * Wajib diisi sebelum ditayangkan. Ini situs resmi instansi pemerintah;
   * pujian yang mengatasnamakan orang dan lembaga tertentu harus bisa
   * ditelusuri keasliannya, bukan sekadar enak dibaca.
   */
  sourceNote: text("source_note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// 7. FAQ website
//
// Terpisah dari beregam_faq (menu bot WhatsApp) yang dibuat nanti. Isinya
// bisa mirip, tapi audiens dan bentuk tampilannya berbeda.
// ---------------------------------------------------------------------------
export const faqs = mysqlTable("faqs", {
  id: int("id").autoincrement().primaryKey(),
  pertanyaan: varchar("pertanyaan", { length: 255 }).notNull(),
  jawaban: text("jawaban").notNull(),
  kategori: varchar("kategori", { length: 60 }),
  sortOrder: int("sort_order").default(0).notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});


// ---------------------------------------------------------------------------
// 8. Analitik pengunjung - data mentah
//
// Self-hosted di MySQL sendiri, bukan layanan pihak ketiga. Alasannya sama
// dengan alasan Beregam menaruh engine di kantor: data pelayanan publik
// instansi tidak perlu keluar, dan tidak ada ketergantungan pada pihak lain.
//
// ALAMAT IP TIDAK PERNAH DISIMPAN. Yang disimpan hanya visitorHash, yaitu
// sha256(ip + userAgent + garam harian). Garamnya berganti tiap hari,
// sehingga hash yang sama tidak bisa dilacak lintas hari. Cukup untuk
// menghitung pengunjung unik, tidak cukup untuk mengenali orangnya.
//
// Retensi 90 hari; ringkasannya sudah aman di analytics_daily.
// ---------------------------------------------------------------------------
export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: int("id").autoincrement().primaryKey(),
    path: varchar("path", { length: 190 }).notNull(),
    referrer: varchar("referrer", { length: 190 }),
    /** sha256(ip + userAgent + garam harian) - bukan identitas. */
    visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
    /** desktop | mobile | tablet */
    device: varchar("device", { length: 20 }).notNull(),
    browser: varchar("browser", { length: 30 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("analytics_events_created_idx").on(t.createdAt),
    index("analytics_events_hash_idx").on(t.visitorHash),
  ]
);

// ---------------------------------------------------------------------------
// 9. Analitik pengunjung - rollup harian
//
// Disimpan selamanya. Dipisah dari data mentah supaya baris mentah bisa
// dihapus setelah 90 hari tanpa kehilangan riwayat.
// ---------------------------------------------------------------------------
export const analyticsDaily = mysqlTable(
  "analytics_daily",
  {
    id: int("id").autoincrement().primaryKey(),
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    views: int("views").default(0).notNull(),
    uniqueVisitors: int("unique_visitors").default(0).notNull(),
    /**
     * Penanda periode backfill.
     *
     * Pencatatan nyata baru dimulai saat modul ini dipasang, sehingga
     * riwayat sebelumnya diisi skrip agar grafik tidak kosong. Penanda ini
     * TIDAK ditampilkan di antarmuka - atas keputusan pemilik sistem,
     * seluruh periode lampau diperlakukan sebagai angka nyata.
     *
     * Kolomnya tetap disimpan supaya periode backfill masih bisa ditelusuri
     * bila suatu saat diperlukan, dan supaya rollup harian tidak menimpa
     * baris backfill dengan nol.
     */
    isSeeded: boolean("is_seeded").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("analytics_daily_tanggal_key").on(t.tanggal)]
);


// ---------------------------------------------------------------------------
// 10. Analitik pengunjung - rollup harian per halaman
//
// Dipisah dari analytics_events supaya "Halaman Terpopuler" tetap punya
// riwayat setelah data mentah dibersihkan pada usia 90 hari.
// ---------------------------------------------------------------------------
export const analyticsPathDaily = mysqlTable(
  "analytics_path_daily",
  {
    id: int("id").autoincrement().primaryKey(),
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    path: varchar("path", { length: 190 }).notNull(),
    views: int("views").default(0).notNull(),
    uniqueVisitors: int("unique_visitors").default(0).notNull(),
    /** Penanda internal periode backfill. Tidak ditampilkan di antarmuka. */
    isSeeded: boolean("is_seeded").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("analytics_path_daily_key").on(t.tanggal, t.path)]
);

// ---------------------------------------------------------------------------
// Tipe turunan - pakai ini di komponen dan route, jangan `any`.
// ---------------------------------------------------------------------------
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type VidconRequest = InferSelectModel<typeof vidconRequests>;
export type NewVidconRequest = InferInsertModel<typeof vidconRequests>;

export type Pengaduan = InferSelectModel<typeof pengaduans>;
export type NewPengaduan = InferInsertModel<typeof pengaduans>;

export type PermintaanData = InferSelectModel<typeof permintaanData>;
export type NewPermintaanData = InferInsertModel<typeof permintaanData>;

export type ContactMessage = InferSelectModel<typeof contacts>;
export type NewContactMessage = InferInsertModel<typeof contacts>;

export type SiteSetting = InferSelectModel<typeof siteSettings>;
export type Testimonial = InferSelectModel<typeof testimonials>;
export type NewTestimonial = InferInsertModel<typeof testimonials>;
export type Faq = InferSelectModel<typeof faqs>;
export type NewFaq = InferInsertModel<typeof faqs>;

export type AnalyticsEvent = InferSelectModel<typeof analyticsEvents>;
export type AnalyticsDaily = InferSelectModel<typeof analyticsDaily>;
export type AnalyticsPathDaily = InferSelectModel<typeof analyticsPathDaily>;
