import * as z from "zod";
import { unstable_cache } from "next/cache";

/**
 * Klien Web API resmi BPS (webapi.bps.go.id).
 *
 * KENAPA LEWAT API RESMI, BUKAN MENGAMBIL DARI HALAMAN WEB
 *
 * Sempat dicoba membaca langsung dari musirawaskab.bps.go.id. Dua alasan
 * kenapa itu ditinggalkan:
 *
 *   1. Daftar publikasinya TIDAK ADA di HTML yang dikirim server - baru
 *      dimuat setelah JavaScript berjalan. Membacanya berarti menjalankan
 *      peramban lengkap di Hostinger, yang tidak mungkin.
 *   2. Situsnya dilindungi penyaring bot (F5 TSPD + Cloudflare). Menembusnya
 *      berarti bekerja melawan pengamanan yang sengaja dipasang pengelola
 *      situs - dan hasilnya akan patah sewaktu-waktu tanpa peringatan.
 *
 * Web API resmi adalah pintu yang memang disediakan BPS untuk keperluan ini,
 * bentuk datanya stabil, dan tautannya sudah kita cantumkan sendiri di
 * halaman layanan PESTA.
 *
 * BUTUH KUNCI. Daftar gratis di https://webapi.bps.go.id/developer lalu isi
 * BPS_WEBAPI_KEY. Tanpa kunci, seluruh fungsi di sini mengembalikan null -
 * dan pemanggil WAJIB menyiapkan jawaban cadangan. Bot yang menjawab
 * "sedang tidak bisa diakses, ini tautannya" jauh lebih baik daripada bot
 * yang diam, dan jauh lebih baik lagi daripada bot yang mengarang.
 *
 * ATURAN MUTLAK #1 tetap berlaku: tidak ada angka statistik yang dikarang.
 * Yang diambil di sini adalah JUDUL, TANGGAL, dan TAUTAN resmi - metadata
 * terbitan, bukan angka hasil olahan. Angka apa pun yang kelak ditampilkan
 * harus datang apa adanya dari sumber resmi, tidak pernah dari perkiraan.
 */

/** Kode domain BPS untuk Kabupaten Musi Rawas (sama dengan kode di bps1605@bps.go.id). */
export const DOMAIN_MUSI_RAWAS = "1605";

const PANGKALAN = "https://webapi.bps.go.id/v1/api";

/** Situs resmi, dipakai untuk menyusun tautan dan sebagai jawaban cadangan. */
export const SITUS_BPS = "https://musirawaskab.bps.go.id";
export const TAUTAN_PUBLIKASI = `${SITUS_BPS}/id/publication`;
export const TAUTAN_TABEL = `${SITUS_BPS}/id/statistics-table`;

/**
 * Batas waktu satu panggilan.
 *
 * Webhook WhatsApp harus selesai cepat - engine akan mengulang kirim bila
 * menunggu terlalu lama. Lebih baik menyerah lalu memakai jawaban cadangan
 * daripada menggantung percakapan warga.
 */
const BATAS_MS = 6000;

/** Umur cache. Publikasi BPS terbit harian paling sering, jadi 6 jam berlebih pun aman. */
const UMUR_CACHE_DETIK = 6 * 60 * 60;

// ---------------------------------------------------------------------------
// Bentuk respons
//
// Sengaja LONGGAR. Bentuk pasti Web API BPS tidak bisa diverifikasi tanpa
// kunci, jadi yang diwajibkan hanya field yang benar-benar dipakai. Bila
// bentuknya ternyata berbeda, hasilnya null dan jawaban cadangan yang
// dipakai - bukan galat yang membuat bot diam.
// ---------------------------------------------------------------------------

const publikasiSchema = z
  .object({
    pub_id: z.union([z.string(), z.number()]).optional(),
    title: z.string(),
    rl_date: z.string().optional(),
    issn: z.string().optional(),
    pdf: z.string().optional(),
  })
  .passthrough();

const tabelSchema = z
  .object({
    table_id: z.union([z.string(), z.number()]).optional(),
    title: z.string(),
    subj: z.string().optional(),
    updt_date: z.string().optional(),
  })
  .passthrough();

export interface Publikasi {
  judul: string;
  tanggal: string | null;
  tautan: string | null;
}

export interface TabelStatistik {
  judul: string;
  subjek: string | null;
  diperbarui: string | null;
}

/** Apakah kunci Web API sudah diisi? Dipakai juga oleh skrip pemeriksa. */
export function adaKunciBps(): boolean {
  return Boolean(process.env.BPS_WEBAPI_KEY?.trim());
}

/**
 * Memanggil Web API BPS sekali, dengan batas waktu.
 *
 * Mengembalikan null - bukan melempar - untuk SEMUA bentuk kegagalan:
 * kunci kosong, jaringan putus, ditolak WAF, JSON rusak, atau status Error
 * dari BPS. Pemanggil hanya perlu memikirkan dua keadaan: ada data, atau
 * tidak ada.
 */
async function panggil(jalur: string): Promise<unknown | null> {
  const kunci = process.env.BPS_WEBAPI_KEY?.trim();
  if (!kunci) return null;

  const kendali = new AbortController();
  const jam = setTimeout(() => kendali.abort(), BATAS_MS);

  try {
    const res = await fetch(`${PANGKALAN}/${jalur}/key/${encodeURIComponent(kunci)}/`, {
      signal: kendali.signal,
      headers: {
        // Beberapa penyaring bot menolak permintaan tanpa User-Agent yang
        // jelas. Menyebut diri apa adanya lebih baik daripada menyamar
        // sebagai peramban.
        "User-Agent": "PESTA-BPS-MusiRawas/1.0 (+https://bpskabmusirawas.com)",
        Accept: "application/json",
      },
      // Cache diurus unstable_cache di lapis atas, bukan di sini.
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[bps-api] ${jalur} menjawab HTTP ${res.status}`);
      return null;
    }

    const teks = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(teks);
    } catch {
      // Halaman blokir WAF berbentuk HTML, bukan JSON.
      console.warn(`[bps-api] ${jalur} membalas bukan JSON (kemungkinan diblokir penyaring)`);
      return null;
    }

    const status = (json as { status?: unknown })?.status;
    if (typeof status === "string" && status.toLowerCase() !== "ok") {
      const pesan = (json as { message?: unknown })?.message;
      console.warn(`[bps-api] ${jalur} status=${status} pesan=${String(pesan).slice(0, 120)}`);
      return null;
    }

    return json;
  } catch (error) {
    const alasan = error instanceof Error && error.name === "AbortError" ? "melewati batas waktu" : String(error).slice(0, 120);
    console.warn(`[bps-api] ${jalur} gagal: ${alasan}`);
    return null;
  } finally {
    clearTimeout(jam);
  }
}

/**
 * Mengambil larik isi dari respons BPS.
 *
 * Bentuknya `data: [ {info halaman}, [ ...isi ] ]`. Ditulis defensif karena
 * bentuk itu tidak bisa diverifikasi tanpa kunci - kalau ternyata berbeda,
 * lebih baik mengembalikan kosong daripada melempar galat.
 */
function ambilLarik(json: unknown): unknown[] {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];

  // Bentuk yang diharapkan: elemen kedua adalah larik isi.
  const kedua = data[1];
  if (Array.isArray(kedua)) return kedua;

  // Cadangan: sebagian endpoint mengembalikan larik isi langsung.
  if (data.every((d) => d && typeof d === "object" && !Array.isArray(d))) return data;

  return [];
}

/** Tanggal ISO/teks BPS -> "30 April 2026". Mengembalikan apa adanya bila tidak terbaca. */
function tanggalIndonesia(teks?: string | null): string | null {
  if (!teks) return null;
  const d = new Date(teks);
  if (Number.isNaN(d.getTime())) return teks;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

async function ambilPublikasiMentah(): Promise<Publikasi[] | null> {
  const json = await panggil(`list/model/publication/lang/ind/domain/${DOMAIN_MUSI_RAWAS}`);
  if (!json) return null;

  const hasil: Publikasi[] = [];
  for (const baris of ambilLarik(json)) {
    const cek = publikasiSchema.safeParse(baris);
    if (!cek.success) continue;
    hasil.push({
      judul: cek.data.title.trim(),
      tanggal: tanggalIndonesia(cek.data.rl_date),
      // `pdf` adalah tautan unduh resmi dari BPS. Dipakai apa adanya.
      tautan: cek.data.pdf?.trim() || null,
    });
  }
  return hasil;
}

async function ambilTabelMentah(): Promise<TabelStatistik[] | null> {
  const json = await panggil(`list/model/statictable/lang/ind/domain/${DOMAIN_MUSI_RAWAS}`);
  if (!json) return null;

  const hasil: TabelStatistik[] = [];
  for (const baris of ambilLarik(json)) {
    const cek = tabelSchema.safeParse(baris);
    if (!cek.success) continue;
    hasil.push({
      judul: cek.data.title.trim(),
      subjek: cek.data.subj?.trim() || null,
      diperbarui: tanggalIndonesia(cek.data.updt_date),
    });
  }
  return hasil;
}

/**
 * Publikasi terbaru BPS Musi Rawas. null bila tidak bisa diambil.
 *
 * Dicache supaya percakapan WhatsApp tidak memanggil Web API BPS berulang
 * kali - selain lambat, itu juga tidak sopan terhadap layanan bersama.
 */
export const ambilPublikasiTerbaru = unstable_cache(
  ambilPublikasiMentah,
  ["bps-publikasi", DOMAIN_MUSI_RAWAS],
  { revalidate: UMUR_CACHE_DETIK, tags: ["bps-publikasi"] }
);

/** Tabel statistik BPS Musi Rawas. null bila tidak bisa diambil. */
export const ambilTabelStatistik = unstable_cache(
  ambilTabelMentah,
  ["bps-tabel", DOMAIN_MUSI_RAWAS],
  { revalidate: UMUR_CACHE_DETIK, tags: ["bps-tabel"] }
);

/** Versi tanpa cache, khusus untuk skrip pemeriksa `npm run cek:bps`. */
export const ambilPublikasiLangsung = ambilPublikasiMentah;
export const ambilTabelLangsung = ambilTabelMentah;
