import {
  mysqlTable,
  bigint,
  int,
  tinyint,
  smallint,
  boolean,
  varchar,
  text,
  datetime,
  date,
  decimal,
  json,
  mysqlEnum,
  index,
  unique,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { users } from "@/lib/db/schema";

/**
 * Skema database modul Beregam.
 *
 * Semua tabel berprefiks `beregam_` supaya tidak pernah bertabrakan dengan
 * tabel layanan PESTA yang sudah ada.
 *
 * SELURUH 14 TABEL DIBUAT SEKARANG, termasuk yang baru dipakai Fase 2-3.
 * Alasannya: menambah tabel di Hostinger berarti menyalin SQL ke phpMyAdmin
 * satu per satu. Sekali kerja lebih baik daripada empat kali.
 *
 * CATATAN WAKTU
 * Semua kolom waktu menyimpan UTC dan diisi oleh kode, bukan oleh MySQL.
 * Penjelasannya ada di src/lib/db/schema.ts dan src/lib/waktu.ts.
 *
 * CATATAN PANJANG INDEX
 * Dengan charset utf8mb4, satu karakter memakan 4 byte. Pada MariaDB lama
 * batas panjang index adalah 767 byte, yaitu 191 karakter. Semua kolom yang
 * di-index di bawah ini sudah pendek. JANGAN menambah index pada kolom
 * varchar(200) atau lebih tanpa memeriksa versi server lebih dulu.
 */

/** Waktu dibuat - selalu UTC, dipasok kode. */
const dibuat = () =>
  datetime("created_at", { mode: "date", fsp: 3 })
    .default(sql`(CURRENT_TIMESTAMP(3))`)
    .$defaultFn(() => new Date())
    .notNull();

/** Waktu diubah - selalu UTC, dipasok kode. */
const diubah = () =>
  datetime("updated_at", { mode: "date", fsp: 3 })
    .default(sql`(CURRENT_TIMESTAMP(3))`)
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull();

/** Kolom waktu opsional. */
const waktu = (nama: string) => datetime(nama, { mode: "date", fsp: 3 });

// ---------------------------------------------------------------------------
// 1. Kontak warga
// ---------------------------------------------------------------------------
export const beregamContacts = mysqlTable(
  "beregam_contacts",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    /** Identitas WhatsApp, mis. 6285169881015@c.us */
    waId: varchar("wa_id", { length: 64 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    name: varchar("name", { length: 120 }),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    messageCount: int("message_count").default(0).notNull(),
    firstSeenAt: waktu("first_seen_at"),
    lastSeenAt: waktu("last_seen_at"),
    /**
     * Warga menyatakan berhenti ("STOP"/"BERHENTI").
     *
     * Tanpa jalan keluar, bot yang tidak diinginkan menjadi gangguan yang
     * tidak bisa dihentikan warga - dan itu persoalan kepatuhan, bukan
     * sekadar kenyamanan.
     */
    optedOutAt: waktu("opted_out_at"),
    createdAt: dibuat(),
    updatedAt: diubah(),
  },
  (t) => [
    unique("beregam_contacts_wa_id_key").on(t.waId),
    index("beregam_contacts_phone_idx").on(t.phone),
  ]
);

// ---------------------------------------------------------------------------
// 2. Sesi percakapan
// ---------------------------------------------------------------------------
export const beregamSessions = mysqlTable(
  "beregam_sessions",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    contactId: bigint("contact_id", { mode: "number" })
      .notNull()
      .references(() => beregamContacts.id, { onDelete: "cascade" }),
    state: varchar("state", { length: 50 }).default("idle").notNull(),
    /**
     * KOLOM PALING PENTING DI SELURUH MODUL.
     *
     * Saat `manual`, BeregamService berhenti membalas otomatis dan hanya
     * mencatat pesan masuk. Tanpa pemeriksaan ini, warga menerima dua
     * jawaban sekaligus - dari petugas dan dari bot - dan bug itu baru
     * ketahuan setelah petugas mulai memakai inbox.
     */
    mode: mysqlEnum("mode", ["bot", "manual"]).default("bot").notNull(),
    context: json("context").$type<Record<string, unknown>>(),
    missCount: tinyint("miss_count").default(0).notNull(),
    /**
     * Dipisah dari `expiresAt` karena keduanya mengukur hal berbeda:
     * sesi kedaluwarsa 30 menit, sedangkan mode manual dikembalikan ke bot
     * setelah 2 jam tanpa aktivitas. Satu kolom tidak cukup untuk dua
     * timeout yang berbeda.
     */
    lastActivityAt: waktu("last_activity_at"),
    expiresAt: waktu("expires_at"),
    createdAt: dibuat(),
    updatedAt: diubah(),
  },
  (t) => [
    unique("beregam_sessions_contact_key").on(t.contactId),
    index("beregam_sessions_mode_idx").on(t.mode),
    index("beregam_sessions_expires_idx").on(t.expiresAt),
  ]
);

/** Asal sebuah pesan keluar. Dipakai untuk jejak audit dan metrik per fase. */
export const SUMBER_PESAN = [
  "bot",
  "faq",
  "semantic",
  "sql",
  "ai",
  "agent",
  /**
   * Balasan yang diketik admin langsung di HP, bukan lewat inbox PESTA.
   *
   * Terjadi saat PC mati: HP pemegang SIM tetap menerima pesan warga, dan
   * admin membalas manual. Tanpa nilai ini, balasan itu tidak pernah
   * tercatat dan inbox akan terlihat seolah warga tidak pernah dijawab -
   * merusak justru hal yang paling bernilai dari sistem ini.
   */
  "agent_phone",
] as const;

// ---------------------------------------------------------------------------
// 3. Riwayat pesan
// ---------------------------------------------------------------------------
export const beregamMessages = mysqlTable(
  "beregam_messages",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    contactId: bigint("contact_id", { mode: "number" })
      .notNull()
      .references(() => beregamContacts.id, { onDelete: "cascade" }),
    direction: mysqlEnum("direction", ["in", "out"]).notNull(),
    /**
     * UNIQUE, bukan index biasa.
     *
     * Deduplikasi webhook mengandalkan kolom ini. Dengan index biasa, dua
     * webhook yang tiba nyaris bersamaan bisa sama-sama lolos pemeriksaan
     * "sudah ada?" lalu keduanya menyimpan - dan warga menerima balasan
     * dobel. UNIQUE membuat database yang menolaknya, bukan kode.
     */
    waMessageId: varchar("wa_message_id", { length: 120 }),
    type: varchar("type", { length: 20 }).default("text").notNull(),
    body: text("body"),
    sentBy: int("sent_by").references(() => users.id, { onDelete: "set null" }),
    source: mysqlEnum("source", SUMBER_PESAN),
    /**
     * Payload mentah dari engine.
     *
     * Catatan PDP: dikosongkan otomatis untuk baris yang lebih tua dari
     * 90 hari lewat runMaintenance().
     */
    raw: json("raw"),
    createdAt: dibuat(),
  },
  (t) => [
    unique("beregam_messages_wa_message_key").on(t.waMessageId),
    index("beregam_messages_contact_idx").on(t.contactId, t.id),
    /** Rate limit 3 balasan/menit/nomor dihitung dari sini. */
    index("beregam_messages_rate_idx").on(t.contactId, t.direction, t.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// 4. Antrean kirim
// ---------------------------------------------------------------------------
export const beregamOutbox = mysqlTable(
  "beregam_outbox",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    contactId: bigint("contact_id", { mode: "number" })
      .notNull()
      .references(() => beregamContacts.id, { onDelete: "cascade" }),
    waId: varchar("wa_id", { length: 64 }).notNull(),
    type: varchar("type", { length: 20 }).default("text").notNull(),
    payload: json("payload").notNull(),
    /**
     * `cancelled` dipakai saat PC pulih dari mati.
     *
     * Balasan yang sempat ditulis PESTA sebelum PC mati masih berstatus
     * pending. Tanpa status ini, balasan berjam-jam lalu ikut terkirim dan
     * warga menerima jawaban atas pertanyaan yang sudah selesai.
     */
    status: mysqlEnum("status", ["pending", "locked", "sent", "failed", "cancelled"])
      .default("pending")
      .notNull(),
    attempts: tinyint("attempts").default(0).notNull(),
    lastError: text("last_error"),
    lockedAt: waktu("locked_at"),
    lockedBy: varchar("locked_by", { length: 64 }),
    scheduledAt: waktu("scheduled_at"),
    sentAt: waktu("sent_at"),
    sentBy: int("sent_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: dibuat(),
    updatedAt: diubah(),
  },
  (t) => [index("beregam_outbox_antrean_idx").on(t.status, t.scheduledAt)]
);

// ---------------------------------------------------------------------------
// 5. Ambil alih petugas
// ---------------------------------------------------------------------------
export const beregamHandovers = mysqlTable(
  "beregam_handovers",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    contactId: bigint("contact_id", { mode: "number" })
      .notNull()
      .references(() => beregamContacts.id, { onDelete: "cascade" }),
    /** Chatbot website nanti memakai inbox yang sama. */
    channel: mysqlEnum("channel", ["wa", "web"]).default("wa").notNull(),
    reason: varchar("reason", { length: 150 }).notNull(),
    status: mysqlEnum("status", ["open", "claimed", "resolved"]).default("open").notNull(),
    /**
     * Kunci kepemilikan.
     *
     * replyToContact() wajib memvalidasi kolom ini terhadap petugas yang
     * sedang login. Tanpa itu, dua petugas bisa membalas warga yang sama.
     */
    assignedTo: int("assigned_to").references(() => users.id, { onDelete: "set null" }),
    claimedAt: waktu("claimed_at"),
    resolvedAt: waktu("resolved_at"),
    resolutionNote: text("resolution_note"),
    createdAt: dibuat(),
    updatedAt: diubah(),
  },
  (t) => [index("beregam_handovers_status_idx").on(t.status)]
);

// ---------------------------------------------------------------------------
// 6. FAQ bot (menu bernomor)
//
// Terpisah dari tabel `faqs` milik website. Isinya bisa mirip, tapi
// audiens dan bentuk tampilannya berbeda.
// ---------------------------------------------------------------------------
export const beregamFaq = mysqlTable(
  "beregam_faq",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Angka yang diketik warga, mis. "1". Null untuk entri bukan menu. */
    menuKey: varchar("menu_key", { length: 20 }),
    parentKey: varchar("parent_key", { length: 20 }),
    title: varchar("title", { length: 150 }).notNull(),
    answer: text("answer").notNull(),
    sortOrder: int("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: dibuat(),
    updatedAt: diubah(),
  },
  (t) => [index("beregam_faq_menu_idx").on(t.menuKey)]
);

// ---------------------------------------------------------------------------
// 7. Status kesehatan sistem (satu baris, id = 1)
// ---------------------------------------------------------------------------
export const beregamHealth = mysqlTable("beregam_health", {
  id: tinyint("id").primaryKey(),
  workerLastSeenAt: waktu("worker_last_seen_at"),
  aiWorkerLastSeenAt: waktu("ai_worker_last_seen_at"),
  /** Status sesi engine WhatsApp, mis. "WORKING". */
  waSessionStatus: varchar("wa_session_status", { length: 30 }),
  meta: json("meta"),
  alertedAt: waktu("alerted_at"),
  /** Kunci agar pemeliharaan tidak berjalan ganda. */
  maintenanceRanAt: waktu("maintenance_ran_at"),
  /**
   * Saklar darurat.
   *
   * Mematikan seluruh balasan otomatis dari admin panel. Tetap bisa diakses
   * di Hostinger meskipun PC kantor mati total - berguna saat pemulihan:
   * periksa dulu keadaannya, baru nyalakan botnya.
   */
  botEnabled: boolean("bot_enabled").default(true).notNull(),
  /**
   * Sewa kepemilikan worker.
   *
   * Hanya worker pemegang sewa yang boleh memproses outbox. Yang lain
   * menganggur dan hanya memantau. Ini yang membuat PC cadangan bisa
   * mengambil alih otomatis tanpa mengirim pesan dobel.
   */
  activeWorkerId: varchar("active_worker_id", { length: 64 }),
  leaseExpiresAt: waktu("lease_expires_at"),
  updatedAt: diubah(),
});

// ---------------------------------------------------------------------------
// 8. Basis pengetahuan (Fase 2)
// ---------------------------------------------------------------------------
export const beregamKb = mysqlTable(
  "beregam_kb",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    category: varchar("category", { length: 60 }),
    sourceType: mysqlEnum("source_type", ["faq", "publikasi", "prosedur", "regulasi"]),
    sourceUrl: varchar("source_url", { length: 300 }),
    sourceRef: varchar("source_ref", { length: 200 }),
    /** sha256 isi. Dipakai AI worker untuk tahu entri mana perlu di-embed ulang. */
    contentHash: varchar("content_hash", { length: 64 }),
    isActive: boolean("is_active").default(true).notNull(),
    indexedAt: waktu("indexed_at"),
    createdAt: dibuat(),
    updatedAt: diubah(),
  },
  (t) => [index("beregam_kb_hash_idx").on(t.contentHash)]
);

// ---------------------------------------------------------------------------
// 9. Catatan pencarian semantik (Fase 2)
//
// Sumber halaman "Celah Pengetahuan": pertanyaan yang gagal dijawab,
// urut frekuensi. Inilah yang memberi tahu petugas materi apa yang perlu
// ditulis berikutnya.
// ---------------------------------------------------------------------------
export const beregamKbHits = mysqlTable("beregam_kb_hits", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  kbId: int("kb_id").references(() => beregamKb.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  score: decimal("score", { precision: 5, scale: 4 }),
  wasUsed: boolean("was_used").default(false).notNull(),
  channel: mysqlEnum("channel", ["wa", "web"]).default("wa").notNull(),
  createdAt: dibuat(),
});

// ---------------------------------------------------------------------------
// 10. Indikator statistik terverifikasi (Fase 3)
//
// SATU-SATUNYA sumber angka yang boleh dikutip bot.
// Isinya data terkurasi dan terverifikasi, bukan hasil scraping mentah.
// ---------------------------------------------------------------------------
export const beregamIndikator = mysqlTable(
  "beregam_indikator",
  {
    id: int("id").autoincrement().primaryKey(),
    kode: varchar("kode", { length: 40 }).notNull(),
    nama: varchar("nama", { length: 200 }).notNull(),
    satuan: varchar("satuan", { length: 40 }),
    wilayahKode: varchar("wilayah_kode", { length: 20 }).notNull(),
    wilayahNama: varchar("wilayah_nama", { length: 100 }),
    tahun: smallint("tahun").notNull(),
    periode: varchar("periode", { length: 20 }),
    nilai: decimal("nilai", { precision: 20, scale: 4 }).notNull(),
    /** Wajib terisi. Setiap angka yang keluar bot menyebutkan sumbernya. */
    sumberPublikasi: varchar("sumber_publikasi", { length: 200 }).notNull(),
    catatan: text("catatan"),
    /**
     * Baris tanpa verifikasi TIDAK BOLEH dikutip bot.
     *
     * Aturan ini dipaksakan di query resolver (`WHERE verified_by IS NOT
     * NULL`), bukan hanya di form admin. Aturan yang cuma dijaga UI akan
     * bocor begitu ada jalur lain yang menulis ke tabel ini.
     */
    verifiedBy: int("verified_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: dibuat(),
    updatedAt: diubah(),
  },
  (t) => [
    unique("beregam_indikator_key").on(t.kode, t.wilayahKode, t.tahun, t.periode),
    index("beregam_indikator_kode_idx").on(t.kode),
    index("beregam_indikator_wilayah_idx").on(t.wilayahKode),
    index("beregam_indikator_tahun_idx").on(t.tahun),
  ]
);

// ---------------------------------------------------------------------------
// 11. Antrean pekerjaan AI (Fase 2/4)
//
// Dibuat sejak sekarang meski Fase 2 belum memakai LLM: kontraknya sudah
// benar sejak awal, sehingga naik ke perangkat yang lebih baik nanti tidak
// mengubah skema maupun API.
// ---------------------------------------------------------------------------
export const beregamAiJobs = mysqlTable(
  "beregam_ai_jobs",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    contactId: bigint("contact_id", { mode: "number" }).references(
      () => beregamContacts.id,
      { onDelete: "set null" }
    ),
    channel: mysqlEnum("channel", ["wa", "web"]).default("wa").notNull(),
    question: text("question").notNull(),
    intent: varchar("intent", { length: 40 }),
    mode: mysqlEnum("mode", ["embed", "generate"]).default("embed").notNull(),
    contextUsed: json("context_used"),
    status: mysqlEnum("status", ["pending", "locked", "done", "failed"])
      .default("pending")
      .notNull(),
    result: text("result"),
    score: decimal("score", { precision: 5, scale: 4 }),
    model: varchar("model", { length: 60 }),
    latencyMs: int("latency_ms"),
    error: text("error"),
    lockedAt: waktu("locked_at"),
    lockedBy: varchar("locked_by", { length: 64 }),
    createdAt: dibuat(),
    updatedAt: diubah(),
  },
  (t) => [index("beregam_ai_jobs_antrean_idx").on(t.status, t.createdAt)]
);

// ---------------------------------------------------------------------------
// 12. Notifikasi sistem
//
// Panduan lama menyuruh watchdog mencatat alert ke "tabel notifikasi",
// tetapi tabelnya tidak pernah didefinisikan. Ini tabel itu.
// ---------------------------------------------------------------------------
export const beregamAlerts = mysqlTable(
  "beregam_alerts",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    /** Pengenal jenis masalah, mis. "worker_mati", "sesi_dibatasi". */
    kode: varchar("kode", { length: 60 }).notNull(),
    severity: mysqlEnum("severity", ["info", "warning", "critical"])
      .default("warning")
      .notNull(),
    pesan: text("pesan").notNull(),
    meta: json("meta"),
    firstSeenAt: waktu("first_seen_at").$defaultFn(() => new Date()),
    lastSeenAt: waktu("last_seen_at"),
    createdAt: dibuat(),
    resolvedAt: waktu("resolved_at"),
  },
  (t) => [index("beregam_alerts_kode_idx").on(t.kode, t.resolvedAt)]
);

// ---------------------------------------------------------------------------
// 13. Hari libur nasional
//
// Tanpa ini, bot akan menjanjikan "petugas membalas hari kerja berikutnya"
// padahal besok cuti bersama. Diisi sekali setahun lewat admin.
// ---------------------------------------------------------------------------
export const beregamHolidays = mysqlTable(
  "beregam_holidays",
  {
    id: int("id").autoincrement().primaryKey(),
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    nama: varchar("nama", { length: 150 }).notNull(),
    createdAt: dibuat(),
  },
  (t) => [unique("beregam_holidays_tanggal_key").on(t.tanggal)]
);

// ---------------------------------------------------------------------------
// 14. Kamus sinonim (Fase 3)
//
// "penduduk" -> kode indikator, "murara" -> kode wilayah, dan seterusnya.
// Ditaruh di tabel, bukan di-hardcode, supaya petugas PST bisa menambah
// sendiri tanpa memanggil pengembang.
// ---------------------------------------------------------------------------
export const beregamSinonim = mysqlTable(
  "beregam_sinonim",
  {
    id: int("id").autoincrement().primaryKey(),
    jenis: mysqlEnum("jenis", ["indikator", "wilayah", "periode"]).notNull(),
    /** Kata yang diketik warga, disimpan huruf kecil. */
    kata: varchar("kata", { length: 100 }).notNull(),
    /** Kode tujuan di beregam_indikator. */
    kodeTarget: varchar("kode_target", { length: 40 }).notNull(),
    createdAt: dibuat(),
    updatedAt: diubah(),
  },
  (t) => [
    unique("beregam_sinonim_key").on(t.jenis, t.kata),
    index("beregam_sinonim_kata_idx").on(t.kata),
  ]
);

// ---------------------------------------------------------------------------
// Tipe turunan
// ---------------------------------------------------------------------------
export type BeregamContact = InferSelectModel<typeof beregamContacts>;
export type NewBeregamContact = InferInsertModel<typeof beregamContacts>;
export type BeregamSession = InferSelectModel<typeof beregamSessions>;
export type BeregamMessage = InferSelectModel<typeof beregamMessages>;
export type NewBeregamMessage = InferInsertModel<typeof beregamMessages>;
export type BeregamOutbox = InferSelectModel<typeof beregamOutbox>;
export type BeregamHandover = InferSelectModel<typeof beregamHandovers>;
export type BeregamFaq = InferSelectModel<typeof beregamFaq>;
export type BeregamHealth = InferSelectModel<typeof beregamHealth>;
export type BeregamKb = InferSelectModel<typeof beregamKb>;
export type BeregamIndikator = InferSelectModel<typeof beregamIndikator>;
export type BeregamAiJob = InferSelectModel<typeof beregamAiJobs>;
export type BeregamAlert = InferSelectModel<typeof beregamAlerts>;
export type BeregamHoliday = InferSelectModel<typeof beregamHolidays>;
export type BeregamSinonim = InferSelectModel<typeof beregamSinonim>;

export type SumberPesan = (typeof SUMBER_PESAN)[number];
