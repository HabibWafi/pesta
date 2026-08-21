import type { Config } from "drizzle-kit";

/**
 * Konfigurasi Drizzle Kit.
 *
 * Alur migration di proyek ini SENGAJA manual, karena Hostinger Business
 * tidak memberi shell bebas:
 *
 *   1. Ubah src/lib/db/schema.ts
 *   2. npm run db:generate       -> menghasilkan berkas SQL di db/migrations/
 *   3. Salin isi SQL itu, jalankan lewat phpMyAdmin di hPanel
 *
 * JANGAN membuat endpoint migration sekali-pakai di aplikasi. Endpoint
 * semacam itu adalah lubang keamanan yang jauh lebih mahal daripada
 * ketidaknyamanan menyalin SQL.
 */
export default {
  schema: ["./src/lib/db/schema.ts", "./src/lib/beregam/db/schema.ts"],
  out: "./db/migrations",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/pesta",
  },
  // Nama tabel di database memakai snake_case (users, vidcon_requests, ...)
  // sementara properti di kode memakai camelCase. Pemetaannya ditulis
  // eksplisit di schema.ts, bukan ditebak otomatis.
  verbose: true,
  strict: true,
} satisfies Config;
