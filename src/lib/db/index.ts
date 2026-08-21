import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

/**
 * Koneksi database PESTA.
 *
 * Menggantikan src/lib/prisma.ts. Perilakunya sengaja dibuat sama persis
 * supaya migrasi ini tidak mengubah apa pun yang terlihat pengguna.
 */

/**
 * Hostinger kadang hanya menyediakan variabel terpisah di hPanel, bukan satu
 * DATABASE_URL utuh. Fallback ini sudah dipakai di produksi - jangan dihapus.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const { DB_USER, DB_NAME } = process.env;
  if (DB_USER && DB_NAME) {
    const pass = process.env.DB_PASS ?? "";
    const host = process.env.DB_HOST ?? "127.0.0.1";
    const port = process.env.DB_PORT ?? "3306";
    return `mysql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(pass)}@${host}:${port}/${DB_NAME}`;
  }

  throw new Error(
    "Koneksi database belum dikonfigurasi. Isi DATABASE_URL di .env, " +
      "atau isi DB_USER/DB_PASS/DB_HOST/DB_PORT/DB_NAME bila hPanel hanya " +
      "menyediakan variabel terpisah."
  );
}

function createPool() {
  return mysql.createPool({
    uri: resolveDatabaseUrl(),

    /**
     * Hostinger Business membatasi jumlah Entry Process, dan aplikasi Node
     * menahan prosesnya selama hidup. Pool yang besar akan menghabiskan
     * jatah itu tanpa memberi manfaat pada beban sebesar ini.
     */
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 0,

    /**
     * WAJIB. Membuat mysql2 menerjemahkan JS Date <-> DATETIME sebagai UTC,
     * bukan sebagai zona waktu mesin yang kebetulan menjalankannya.
     *
     * Tanpa ini, waktu yang ditulis dari komputer pengembangan (WIB) dan dari
     * Hostinger (kemungkinan UTC) akan berbeda 7 jam untuk kejadian yang sama,
     * dan selisih itu baru ketahuan saat ada yang menghitung laporan bulanan.
     */
    timezone: "Z",

    /** Kolom bigint Beregam nanti melebihi Number.MAX_SAFE_INTEGER. */
    supportBigNumbers: true,
    bigNumberStrings: false,

    charset: "utf8mb4_unicode_ci",
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
  });
}

/**
 * Next.js dev me-reload modul setiap kali berkas berubah. Tanpa singleton,
 * setiap reload membuat pool baru dan koneksi lama menumpuk sampai MySQL
 * menolak. Pola yang sama dipakai src/lib/prisma.ts sebelumnya.
 */
const globalForDb = globalThis as unknown as {
  pestaPool?: mysql.Pool;
};

const pool = globalForDb.pestaPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pestaPool = pool;

export const db = drizzle(pool, { schema, mode: "default" });

export { pool, schema };
