import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsDaily, analyticsEvents } from "@/lib/db/schema";

/**
 * Analitik pengunjung, self-hosted.
 *
 * ATURAN YANG TIDAK BOLEH DILANGGAR:
 * Alamat IP tidak pernah disimpan, tidak di kolom mana pun, tidak di log.
 * Yang disimpan hanya sidik ringkas yang cukup untuk menghitung pengunjung
 * unik dalam satu hari, dan tidak cukup untuk mengenali orangnya.
 */

/**
 * Garam harian untuk hash pengunjung.
 *
 * Dibangkitkan acak saat proses start dan berganti tiap hari. Karena garam
 * berbeda tiap hari, sidik pengunjung yang sama tidak bisa dihubungkan
 * antar hari - itu yang membuatnya menghitung, bukan melacak.
 *
 * Disimpan di memori proses, sengaja tidak dipersistenkan: kalau aplikasi
 * restart, garam berganti dan hitungan unik hari itu sedikit terlalu tinggi.
 * Itu harga yang jauh lebih murah daripada menyimpan kunci yang bisa dipakai
 * merangkai jejak seseorang.
 */
const garamGlobal = globalThis as unknown as {
  pestaGaram?: { tanggal: string; nilai: string };
};

function garamHariIni(): string {
  const hariIni = new Date().toISOString().slice(0, 10);
  if (garamGlobal.pestaGaram?.tanggal !== hariIni) {
    garamGlobal.pestaGaram = { tanggal: hariIni, nilai: randomBytes(32).toString("hex") };
  }
  return garamGlobal.pestaGaram.nilai;
}

/** Sidik pengunjung. IP dipakai untuk menghitung, lalu dibuang. */
export function sidikPengunjung(ip: string, userAgent: string): string {
  return createHash("sha256").update(`${ip}|${userAgent}|${garamHariIni()}`).digest("hex");
}

/** Menebak jenis perangkat dari user agent. Cukup kasar, memang. */
export function kenaliPerangkat(ua: string): "mobile" | "tablet" | "desktop" {
  const t = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(t)) return "tablet";
  if (/mobi|android|iphone|ipod|windows phone/.test(t)) return "mobile";
  return "desktop";
}

/** Menebak peramban dari user agent. Urutannya penting - Edge memuat "Chrome". */
export function kenaliBrowser(ua: string): string {
  const t = ua.toLowerCase();
  if (t.includes("edg/")) return "Edge";
  if (t.includes("opr/") || t.includes("opera")) return "Opera";
  if (t.includes("samsungbrowser")) return "Samsung Internet";
  if (t.includes("firefox")) return "Firefox";
  if (t.includes("chrome") || t.includes("crios")) return "Chrome";
  if (t.includes("safari")) return "Safari";
  return "Lainnya";
}

/**
 * Menyaring perayap dan bot.
 *
 * Perekaman memang lewat beacon dari browser, jadi sebagian besar bot sudah
 * tersaring dengan sendirinya. Ini lapis kedua untuk bot yang menjalankan
 * JavaScript.
 */
export function tampaknyaBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|monitor|uptime|curl|wget|python-requests/i.test(
    ua
  );
}

/** Mengambil IP dari header proxy. Nilainya hanya lewat, tidak disimpan. */
export function bacaIp(headers: Headers): string {
  const teruskan = headers.get("x-forwarded-for");
  if (teruskan) return teruskan.split(",")[0].trim();
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "0.0.0.0";
}

/** Tanggal hari ini dalam format YYYY-MM-DD (UTC). */
function tanggalHariIni(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Menghitung ulang rollup satu hari dari data mentah.
 *
 * Dipanggil dari /api/track dengan gerbang waktu - pola yang sama dengan
 * runMaintenance() Beregam, sehingga tidak butuh cron sama sekali.
 *
 * Baris bertanda isSeeded TIDAK PERNAH ditimpa. Data simulasi dan data
 * nyata tidak boleh saling mengotori.
 */
export async function hitungRollup(tanggal = tanggalHariIni()): Promise<void> {
  const [ada] = await db
    .select({ id: analyticsDaily.id, isSeeded: analyticsDaily.isSeeded })
    .from(analyticsDaily)
    .where(eq(analyticsDaily.tanggal, tanggal))
    .limit(1);

  if (ada?.isSeeded) return;

  const [agregat] = await db
    .select({
      views: sql<number>`count(*)`,
      unik: sql<number>`count(distinct ${analyticsEvents.visitorHash})`,
    })
    .from(analyticsEvents)
    .where(sql`date(${analyticsEvents.createdAt}) = ${tanggal}`);

  const views = Number(agregat?.views ?? 0);
  const unik = Number(agregat?.unik ?? 0);

  if (ada) {
    await db
      .update(analyticsDaily)
      .set({ views, uniqueVisitors: unik })
      .where(eq(analyticsDaily.id, ada.id));
  } else {
    await db
      .insert(analyticsDaily)
      .values({ tanggal, views, uniqueVisitors: unik, isSeeded: false });
  }
}

/** Menghapus data mentah lebih tua dari 90 hari. Rollup-nya tetap aman. */
export async function bersihkanEventLama(): Promise<void> {
  const batas = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await db.delete(analyticsEvents).where(lte(analyticsEvents.createdAt, batas));
}

/**
 * Pemeliharaan bergerbang waktu.
 *
 * Dipanggil setiap kali ada kunjungan, tapi hanya benar-benar berjalan
 * sekali per lima menit. Tanpa gerbang ini, halaman ramai akan menghitung
 * ulang rollup ratusan kali per menit tanpa guna.
 */
const jadwal = globalThis as unknown as { pestaRollupTerakhir?: number };

export async function pemeliharaanAnalitik(): Promise<void> {
  const sekarang = Date.now();
  if (jadwal.pestaRollupTerakhir && sekarang - jadwal.pestaRollupTerakhir < 5 * 60_000) {
    return;
  }
  jadwal.pestaRollupTerakhir = sekarang;

  try {
    await hitungRollup();
    // Pembersihan retensi cukup sesekali; ditumpangkan pada rollup.
    if (new Date().getUTCHours() === 3) await bersihkanEventLama();
  } catch (error) {
    console.error("Pemeliharaan analitik gagal:", error);
  }
}

// ---------------------------------------------------------------------------
// Pembacaan untuk halaman admin
// ---------------------------------------------------------------------------

export interface RingkasanHarian {
  tanggal: string;
  views: number;
  uniqueVisitors: number;
  isSeeded: boolean;
}

/** Rollup harian dalam rentang tanggal (inklusif). */
export async function ambilHarian(dari: string, sampai: string): Promise<RingkasanHarian[]> {
  return db
    .select({
      tanggal: analyticsDaily.tanggal,
      views: analyticsDaily.views,
      uniqueVisitors: analyticsDaily.uniqueVisitors,
      isSeeded: analyticsDaily.isSeeded,
    })
    .from(analyticsDaily)
    .where(and(gte(analyticsDaily.tanggal, dari), lte(analyticsDaily.tanggal, sampai)))
    .orderBy(analyticsDaily.tanggal);
}

export interface RingkasanBulanan {
  bulan: string;
  views: number;
  uniqueVisitors: number;
  /** true bila ada satu saja hari simulasi di bulan itu. */
  adaSimulasi: boolean;
}

/** Meringkas rollup harian menjadi bulanan. */
export function ringkasBulanan(harian: RingkasanHarian[]): RingkasanBulanan[] {
  const peta = new Map<string, RingkasanBulanan>();
  for (const h of harian) {
    const bulan = h.tanggal.slice(0, 7);
    const b = peta.get(bulan) ?? { bulan, views: 0, uniqueVisitors: 0, adaSimulasi: false };
    b.views += h.views;
    b.uniqueVisitors += h.uniqueVisitors;
    if (h.isSeeded) b.adaSimulasi = true;
    peta.set(bulan, b);
  }
  return [...peta.values()].sort((a, b) => a.bulan.localeCompare(b.bulan));
}

/** Halaman terpopuler dari data mentah (hanya data nyata, 90 hari terakhir). */
export async function ambilHalamanTerpopuler(batas = 10) {
  return db
    .select({
      path: analyticsEvents.path,
      views: sql<number>`count(*)`,
      unik: sql<number>`count(distinct ${analyticsEvents.visitorHash})`,
    })
    .from(analyticsEvents)
    .groupBy(analyticsEvents.path)
    .orderBy(desc(sql`count(*)`))
    .limit(batas);
}

/** Rincian perangkat dan peramban (hanya data nyata). */
export async function ambilRincianPerangkat() {
  const [perangkat, browser] = await Promise.all([
    db
      .select({ nama: analyticsEvents.device, jumlah: sql<number>`count(*)` })
      .from(analyticsEvents)
      .groupBy(analyticsEvents.device)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ nama: analyticsEvents.browser, jumlah: sql<number>`count(*)` })
      .from(analyticsEvents)
      .groupBy(analyticsEvents.browser)
      .orderBy(desc(sql`count(*)`)),
  ]);
  return { perangkat, browser };
}
