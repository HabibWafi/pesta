import * as z from "zod";
import { unstable_cache } from "next/cache";
import {
  bpsDynamicConfigSchema,
  bpsSimdasiConfigSchema,
  type LEVEL_WILAYAH,
} from "@/lib/schemas/dashboard-data";

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

const detailTabelSchema = z.object({
  table_id: z.union([z.string(), z.number()]),
  title: z.string(),
  updt_date: z.string().optional(),
  excel: z.string().optional(),
  size: z.string().optional(),
}).passthrough();

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

export interface DetailTabelStatistik {
  id: string;
  judul: string;
  diperbarui: string | null;
  tautanUnduh: string | null;
  ukuran: string | null;
}

export interface BpsObservation {
  periodeKode: string;
  periode: string;
  tahun: number;
  wilayahKode: string;
  wilayahNama: string;
  wilayahLevel: (typeof LEVEL_WILAYAH)[number];
  dimensi: Record<string, string>;
  nilai: string;
}

export interface BpsDatasetResult {
  nama: string;
  satuan: string | null;
  definisi: string | null;
  catatan: string | null;
  sourceRef: string;
  sourceUrl: string;
  sourceUpdatedAt: Date | null;
  observations: BpsObservation[];
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
async function panggil(jalur: string, base = PANGKALAN): Promise<unknown | null> {
  const kunci = process.env.BPS_WEBAPI_KEY?.trim();
  if (!kunci) return null;

  const kendali = new AbortController();
  const jam = setTimeout(() => kendali.abort(), BATAS_MS);

  try {
    const res = await fetch(`${base}/${jalur}/key/${encodeURIComponent(kunci)}/`, {
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

function jumlahHalaman(json: unknown): number {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object") return 1;
  const pages = Number((data[0] as { pages?: unknown }).pages ?? 1);
  return Number.isInteger(pages) && pages > 0 ? Math.min(pages, 100) : 1;
}

/** Mengikuti pagination endpoint daftar secara berurutan agar beban tetap kecil. */
async function panggilDaftar(jalur: string): Promise<unknown[] | null> {
  const first = await panggil(jalur);
  if (!first) return null;
  const rows = ambilLarik(first);
  const pages = jumlahHalaman(first);
  for (let page = 2; page <= pages; page += 1) {
    const next = await panggil(`${jalur}/page/${page}`);
    if (!next) return null;
    rows.push(...ambilLarik(next));
  }
  return rows;
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
  const rows = await panggilDaftar(`list/model/publication/lang/ind/domain/${DOMAIN_MUSI_RAWAS}`);
  if (!rows) return null;

  const hasil: Publikasi[] = [];
  for (const baris of rows) {
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
  const rows = await panggilDaftar(`list/model/statictable/lang/ind/domain/${DOMAIN_MUSI_RAWAS}`);
  if (!rows) return null;

  const hasil: TabelStatistik[] = [];
  for (const baris of rows) {
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

/** Detail tabel statis hanya dipakai sebagai metadata/tautan unduh, bukan HTML tabelnya. */
export async function ambilDetailTabelLangsung(idTabel: string): Promise<DetailTabelStatistik | null> {
  const json = await panggil(
    `model/statictable/lang/ind/domain/${DOMAIN_MUSI_RAWAS}/id/${encodeURIComponent(idTabel)}`,
    "https://webapi.bps.go.id/v1/view"
  );
  const parsed = detailTabelSchema.safeParse((json as { data?: unknown } | null)?.data);
  if (!parsed.success) return null;
  return {
    id: String(parsed.data.table_id),
    judul: parsed.data.title.trim(),
    diperbarui: tanggalIndonesia(parsed.data.updt_date),
    tautanUnduh: parsed.data.excel?.trim() || null,
    ukuran: parsed.data.size?.trim() || null,
  };
}

// ---------------------------------------------------------------------------
// Isi data untuk Dashboard Data
// ---------------------------------------------------------------------------

const pilihanSchema = z.object({
  val: z.union([z.string(), z.number()]),
  label: z.union([z.string(), z.number()]),
}).passthrough();

const dynamicDataSchema = z.object({
  status: z.string().optional(),
  var: z.array(z.object({
    val: z.union([z.string(), z.number()]),
    label: z.string(),
    unit: z.string().optional().nullable(),
    def: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
  }).passthrough()).min(1),
  turvar: z.array(pilihanSchema).default([]),
  vervar: z.array(pilihanSchema).default([]),
  tahun: z.array(pilihanSchema).min(1),
  turtahun: z.array(pilihanSchema).default([]),
  datacontent: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
}).passthrough();

function nilaiDesimal(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const bersih = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!bersih || !/^-?\d+(?:\.\d+)?$/.test(bersih)) return null;
  return bersih;
}

function id(value: string | number): string {
  return String(value);
}

/**
 * Mengurai kunci `datacontent` tanpa menebak lebar masing-masing ID.
 * Kombinasi ID dibentuk kembali dari daftar metadata resmi dan hanya nilai
 * yang kuncinya benar-benar ada yang diterima.
 */
export function uraiDataDinamis(
  input: unknown,
  sourceRef: string,
  level: BpsObservation["wilayahLevel"]
): BpsDatasetResult | null {
  const parsed = dynamicDataSchema.safeParse(input);
  if (!parsed.success) return null;
  const data = parsed.data;
  const variable = data.var[0];
  const turvar = data.turvar.length ? data.turvar : [{ val: 0, label: "Total" }];
  const vervar = data.vervar.length ? data.vervar : [{ val: DOMAIN_MUSI_RAWAS, label: "Kabupaten Musi Rawas" }];
  const turtahun = data.turtahun.length ? data.turtahun : [{ val: 0, label: "Tahun" }];
  const observations: BpsObservation[] = [];

  for (const area of vervar) {
    for (const karakteristik of turvar) {
      for (const tahun of data.tahun) {
        for (const turunan of turtahun) {
          const key = `${id(area.val)}${id(variable.val)}${id(karakteristik.val)}${id(tahun.val)}${id(turunan.val)}`;
          const nilai = nilaiDesimal(data.datacontent[key]);
          if (nilai === null) continue;
          const labelTahun = id(tahun.label);
          const tahunAngka = Number.parseInt(labelTahun, 10);
          if (!Number.isFinite(tahunAngka)) continue;
          const labelTurunan = id(turunan.label);
          const periode = !labelTurunan || /^tahun$/i.test(labelTurunan)
            ? labelTahun
            : `${labelTurunan} ${labelTahun}`;
          const dimensi: Record<string, string> = {};
          if (id(karakteristik.label) !== "Total") dimensi.karakteristik = id(karakteristik.label);
          if (level === "kabupaten" && id(area.label) !== "Kabupaten Musi Rawas") {
            dimensi.baris = id(area.label);
          }

          observations.push({
            periodeKode: `${id(tahun.val)}:${id(turunan.val)}`,
            periode,
            tahun: tahunAngka,
            wilayahKode: level === "kabupaten" ? DOMAIN_MUSI_RAWAS : id(area.val),
            wilayahNama: level === "kabupaten" ? "Kabupaten Musi Rawas" : id(area.label),
            wilayahLevel: level,
            dimensi,
            nilai,
          });
        }
      }
    }
  }

  return {
    nama: variable.label.trim(),
    satuan: variable.unit?.trim() || null,
    definisi: variable.def?.trim() || null,
    catatan: variable.note?.trim() || null,
    sourceRef,
    sourceUrl: `https://webapi.bps.go.id/v1/api/list/model/data/lang/ind/domain/${DOMAIN_MUSI_RAWAS}/var/${encodeURIComponent(sourceRef)}`,
    sourceUpdatedAt: responseDate(input),
    observations,
  };
}

export async function ambilDataDinamisLangsung(
  sourceRef: string,
  configInput: unknown
): Promise<BpsDatasetResult | null> {
  const config = bpsDynamicConfigSchema.parse(configInput);
  const bagian = [
    "list/model/data/lang/ind",
    `domain/${DOMAIN_MUSI_RAWAS}`,
    `var/${encodeURIComponent(sourceRef)}`,
    `th/${encodeURIComponent(config.th)}`,
  ];
  if (config.turvar) bagian.push(`turvar/${encodeURIComponent(config.turvar)}`);
  if (config.vervar) bagian.push(`vervar/${encodeURIComponent(config.vervar)}`);
  if (config.turth) bagian.push(`turth/${encodeURIComponent(config.turth)}`);
  const json = await panggil(bagian.join("/"));
  return json ? uraiDataDinamis(json, sourceRef, config.wilayahLevel) : null;
}

function collectValueRows(value: unknown, target: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectValueRows(item, target);
    return;
  }
  if (!value || typeof value !== "object") return;
  const row = value as Record<string, unknown>;
  if ("nilai" in row && ("tahun" in row || "period" in row || "periode" in row)) target.push(row);
  for (const child of Object.values(row)) collectValueRows(child, target);
}

function firstText(value: unknown, keys: string[]): string | null {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = firstText(child, keys);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = row[key];
    if ((typeof candidate === "string" || typeof candidate === "number") && String(candidate).trim()) return String(candidate).trim();
  }
  for (const child of Object.values(row)) {
    const found = firstText(child, keys);
    if (found) return found;
  }
  return null;
}

function responseDate(value: unknown): Date | null {
  const text = firstText(value, ["updated_at", "updt_date", "created", "tanggal_update"]);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** SIMDASI memiliki beberapa bentuk tabel; hanya baris bernilai eksplisit diterima. */
export function uraiDataSimdasi(input: unknown, configInput: unknown): BpsDatasetResult | null {
  const config = bpsSimdasiConfigSchema.parse(configInput);
  const rows: Record<string, unknown>[] = [];
  collectValueRows(input, rows);
  const observations: BpsObservation[] = [];
  for (const row of rows) {
    const nilai = nilaiDesimal(row.nilai);
    const tahun = Number.parseInt(String(row.tahun ?? row.period ?? row.periode), 10);
    if (nilai === null || !Number.isFinite(tahun)) continue;
    const wilayahKode = String(row.kode_wilayah ?? row.wilayah_kode ?? config.wilayah);
    const wilayahNama = String(row.nama_wilayah ?? row.wilayah_nama ?? "Kabupaten Musi Rawas");
    const dimensi: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (/^(nama_(item_)?kategori|kategori|kolom|baris)/.test(key) && value) dimensi[key] = String(value);
    }
    observations.push({
      periodeKode: String(tahun),
      periode: String(tahun),
      tahun,
      wilayahKode,
      wilayahNama,
      wilayahLevel: config.wilayahLevel,
      dimensi,
      nilai,
    });
  }
  return {
    nama: firstText(input, ["judul", "title", "nama_tabel"]) ?? `Tabel SIMDASI ${config.idTabel}`,
    satuan: firstText(input, ["satuan", "unit"]),
    definisi: null,
    catatan: firstText(input, ["catatan", "note"]),
    sourceRef: config.idTabel,
    sourceUrl: "https://webapi.bps.go.id/documentation/",
    sourceUpdatedAt: responseDate(input),
    observations,
  };
}

export async function ambilDataSimdasiLangsung(configInput: unknown): Promise<BpsDatasetResult | null> {
  const config = bpsSimdasiConfigSchema.parse(configInput);
  const json = await panggil(
    `interoperabilitas/datasource/simdasi/id/25/wilayah/${encodeURIComponent(config.wilayah)}` +
      `/tahun/${config.tahun}/id_tabel/${encodeURIComponent(config.idTabel)}`
  );
  return json ? uraiDataSimdasi(json, config) : null;
}
