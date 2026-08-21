/**
 * Mengisi rollup analitik dengan DATA SIMULASI, Januari 2025 sampai hari ini.
 *
 *   npm run db:seed:analitik          isi data simulasi
 *   npm run db:seed:analitik -- hapus buang semua data simulasi
 *
 * PERINGATAN YANG TIDAK BOLEH DIABAIKAN
 *
 * Ini instansi statistik. Angka karangan yang tidak bisa dibedakan dari
 * angka nyata bukan sekadar masalah teknis - ia merusak hal yang justru
 * jadi nilai lembaga ini.
 *
 * Karena itu:
 *   - Setiap baris yang dibuat skrip ini bertanda is_seeded = true
 *   - Halaman admin WAJIB melabelinya sebagai "data simulasi"
 *   - Rollup harian tidak pernah menimpa baris bertanda simulasi, sehingga
 *     data nyata dan data simulasi tidak saling mengotori
 *   - Perintah `hapus` tersedia supaya seluruh simulasi bisa dibuang bersih
 *     begitu data nyata sudah cukup panjang
 *
 * Angkanya sengaja dibuat wajar, bukan mengesankan: tumbuh perlahan, turun
 * di akhir pekan, naik sedikit saat rilis awal bulan.
 */

import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db/index.js";
import { analyticsDaily } from "../../src/lib/db/schema.js";

const MULAI = "2025-01-01";

function* rentangTanggal(dari: string, sampai: string) {
  const d = new Date(dari + "T00:00:00Z");
  const akhir = new Date(sampai + "T00:00:00Z");
  while (d <= akhir) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

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
      // Jangan pernah menimpa data nyata dengan angka karangan.
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
    dibuat += 1;
  }

  console.log(`  Data simulasi   : ${dibuat} hari (${MULAI} s.d. ${hariIni})`);
  if (dilewat > 0) {
    console.log(`  Dilewati        : ${dilewat} hari sudah berisi DATA NYATA`);
  }
  console.log("");
  console.log("  Semua baris bertanda is_seeded = true dan akan dilabeli");
  console.log("  'data simulasi' di halaman admin.");
  console.log("");
  console.log("  Buang seluruhnya dengan: npm run db:seed:analitik -- hapus");
}

async function hapus() {
  const [hasil] = await db.delete(analyticsDaily).where(eq(analyticsDaily.isSeeded, true));
  console.log(`  ${hasil.affectedRows} baris data simulasi dihapus.`);
  console.log("  Data nyata tidak tersentuh.");
}

async function main() {
  const perintah = process.argv[2];
  if (perintah === "hapus") {
    console.log("Menghapus data simulasi analitik...\n");
    await hapus();
  } else {
    console.log("Mengisi data simulasi analitik...\n");
    await isi();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Gagal:", error);
  process.exit(1);
});
