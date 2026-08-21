import {
  mysqlTable,
  int,
  tinyint,
  boolean,
  varchar,
  text,
  datetime,
  json,
  unique,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

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
// Tipe turunan - pakai ini di komponen dan route, jangan `any`.
// ---------------------------------------------------------------------------
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type VidconRequest = InferSelectModel<typeof vidconRequests>;
export type NewVidconRequest = InferInsertModel<typeof vidconRequests>;

export type Pengaduan = InferSelectModel<typeof pengaduans>;
export type NewPengaduan = InferInsertModel<typeof pengaduans>;

export type ContactMessage = InferSelectModel<typeof contacts>;
export type NewContactMessage = InferInsertModel<typeof contacts>;

export type SiteSetting = InferSelectModel<typeof siteSettings>;
export type Testimonial = InferSelectModel<typeof testimonials>;
export type NewTestimonial = InferInsertModel<typeof testimonials>;
export type Faq = InferSelectModel<typeof faqs>;
export type NewFaq = InferInsertModel<typeof faqs>;
