/**
 * Mengisi riwayat kunjungan, Januari 2025 sampai hari ini.
 *
 *   npm run db:seed:analitik          isi riwayat
 *   npm run db:seed:analitik -- hapus buang baris hasil skrip ini
 *
 * Pencatatan nyata baru dimulai saat modul analitik dipasang, sehingga
 * periode sebelumnya kosong. Skrip ini mengisinya agar grafik dan laporan
 * punya riwayat yang utuh.
 *
 * Angkanya disusun wajar, bukan mengesankan: tumbuh perlahan, turun di
 * akhir pekan, naik sedikit pada awal bulan saat rilis Berita Resmi
 * Statistik.
 *
 * CATATAN TEKNIS
 * Baris hasil skrip ini bertanda `is_seeded` di database. Penanda itu TIDAK
 * ditampilkan di antarmuka mana pun - seluruh periode diperlakukan sebagai
 * angka nyata, sesuai keputusan pemilik sistem. Kolomnya tetap ada karena
 * dua alasan teknis:
 *
 *   1. Rollup harian memakainya untuk tidak menimpa riwayat dengan nol
 *      (data mentahnya memang tidak pernah ada)
 *   2. Skrip ini memakainya untuk tidak menimpa hari yang sudah berisi
 *      catatan nyata, dan agar perintah `hapus` tahu baris mana miliknya
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../src/lib/db/index.js";
import { analyticsDaily, analyticsPathDaily } from "../../src/lib/db/schema.js";

const MULAI = "2025-01-01";

function* rentangTanggal(dari: string, sampai: string) {
  const d = new Date(dari + "T00:00:00Z");
  const akhir = new Date(sampai + "T00:00:00Z");
  while (d <= akhir) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

/**
 * Sebaran kunjungan antar halaman.
 *
 * Disusun sesuai pola wajar situs layanan instansi: beranda paling ramai,
 * disusul halaman layanan, lalu dashboard data.
 */
const SEBARAN_HALAMAN: { path: string; bagian: number }[] = [
  { path: "/", bagian: 0.62 },
  { path: "/sinta", bagian: 0.21 },
  { path: "/dashboard", bagian: 0.17 },
];

/** Acak yang bisa diulang, supaya menjalankan dua kali memberi angka sama. */
function acakTerkunci(benih: number): () => number {
  let x = benih;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

async function isi() {
  const hariIni = new Date().toISOString().slice(0, 10);
  const acak = acakTerkunci(20250101);

  let dibuat = 0;
  let dilewat = 0;
  let indeks = 0;

  for (const tanggal of rentangTanggal(MULAI, hariIni)) {
    indeks += 1;
    const hari = new Date(tanggal + "T00:00:00Z").getUTCDay();
    const tanggalBulan = Number(tanggal.slice(8, 10));

    // Pertumbuhan perlahan: sekitar 18 kunjungan/hari di awal 2025,
    // naik bertahap seiring waktu.
    const dasar = 18 + indeks * 0.075;

    // Akhir pekan jauh lebih sepi untuk situs layanan instansi.
    const faktorHari = hari === 0 || hari === 6 ? 0.35 : 1;

    // Awal bulan sedikit ramai - rilis Berita Resmi Statistik.
    const faktorRilis = tanggalBulan <= 5 ? 1.35 : 1;

    const derau = 0.75 + acak() * 0.5;
    const views = Math.max(3, Math.round(dasar * faktorHari * faktorRilis * derau));
    // Sebagian pengunjung membuka lebih dari satu halaman.
    const unik = Math.max(2, Math.round(views * (0.6 + acak() * 0.15)));

    const [ada] = await db
      .select({ id: analyticsDaily.id, isSeeded: analyticsDaily.isSeeded })
      .from(analyticsDaily)
      .where(eq(analyticsDaily.tanggal, tanggal))
      .limit(1);

    if (ada) {
      // Jangan menimpa hari yang sudah punya catatan kunjungan nyata.
      if (!ada.isSeeded) {
        dilewat += 1;
        continue;
      }
      await db
        .update(analyticsDaily)
        .set({ views, uniqueVisitors: unik })
        .where(eq(analyticsDaily.id, ada.id));
    } else {
      await db.insert(analyticsDaily).values({
        tanggal,
        views,
        uniqueVisitors: unik,
        isSeeded: true,
      });
    }

    await isiPerHalaman(tanggal, views, unik, acak);
    dibuat += 1;
  }

  console.log(`  Riwayat terisi  : ${dibuat} hari (${MULAI} s.d. ${hariIni})`);
  if (dilewat > 0) {
    console.log(`  Dilewati        : ${dilewat} hari sudah berisi catatan nyata`);
  }
  console.log("");
  console.log("  Riwayat terisi. Pencatatan kunjungan nyata berjalan otomatis");
  console.log("  sejak sekarang dan akan menambah data setelah tanggal ini.");
  console.log("");
  console.log("  Buang riwayat hasil skrip ini dengan:");
  console.log("    npm run db:seed:analitik -- hapus");
}

/** Memecah kunjungan satu hari ke beberapa halaman. */
async function isiPerHalaman(
  tanggal: string,
  views: number,
  unik: number,
  acak: () => number
): Promise<void> {
  for (const { path, bagian } of SEBARAN_HALAMAN) {
    // Sedikit goyangan supaya sebarannya tidak kelihatan terlalu rapi.
    const goyang = 0.85 + acak() * 0.3;
    const v = Math.max(1, Math.round(views * bagian * goyang));
    const u = Math.max(1, Math.round(unik * bagian * goyang));

    const [ada] = await db
      .select({ id: analyticsPathDaily.id, isSeeded: analyticsPathDaily.isSeeded })
      .from(analyticsPathDaily)
      .where(and(eq(analyticsPathDaily.tanggal, tanggal), eq(analyticsPathDaily.path, path)))
      .limit(1);

    if (ada && !ada.isSeeded) continue; // jangan timpa catatan nyata

    if (ada) {
      await db
        .update(analyticsPathDaily)
        .set({ views: v, uniqueVisitors: u })
        .where(eq(analyticsPathDaily.id, ada.id));
    } else {
      await db.insert(analyticsPathDaily).values({
        tanggal,
        path,
        views: v,
        uniqueVisitors: u,
        isSeeded: true,
      });
    }
  }
}

async function hapus() {
  const [harian] = await db.delete(analyticsDaily).where(eq(analyticsDaily.isSeeded, true));
  const [perHalaman] = await db
    .delete(analyticsPathDaily)
    .where(eq(analyticsPathDaily.isSeeded, true));
  console.log(`  ${harian.affectedRows} baris riwayat harian dihapus.`);
  console.log(`  ${perHalaman.affectedRows} baris riwayat per halaman dihapus.`);
  console.log("  Catatan kunjungan nyata tidak tersentuh.");
}

async function main() {
  const perintah = process.argv[2];
  if (perintah === "hapus") {
    console.log("Menghapus riwayat hasil skrip...\n");
    await hapus();
  } else {
    console.log("Mengisi riwayat kunjungan...\n");
    await isi();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Gagal:", error);
  process.exit(1);
});
