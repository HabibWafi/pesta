import * as z from "zod";

/**
 * Pilihan pendampingan inklusif.
 *
 * Pertanyaannya sengaja disusun sebagai "pendampingan apa yang Anda butuhkan",
 * bukan "disabilitas Anda apa". Lebih bermartabat bagi warga, dan langsung
 * berguna bagi petugas PST karena tiap nilai memetakan ke persiapan konkret.
 *
 * UU No. 8 Tahun 2016 Pasal 4 membagi ragam disabilitas menjadi fisik,
 * intelektual, mental, dan sensorik, serta menyatakan bisa dialami secara
 * tunggal, ganda, atau multi. Karena itu nilainya disimpan sebagai ARRAY,
 * bukan satu nilai tunggal.
 */
export const LAYANAN_INKLUSIF = [
  "NONE",
  "TULI_JBI",
  "TULI_TEKS",
  "NETRA",
  "WICARA",
  "FISIK_MOBILITAS",
  "INTELEKTUAL",
  "MENTAL",
  "LANSIA",
  "PENDAMPING",
  "LAINNYA",
] as const;

export type LayananInklusif = (typeof LAYANAN_INKLUSIF)[number];

/** Label untuk warga, dan apa yang disiapkan petugas bila dipilih. */
export const LAYANAN_INKLUSIF_INFO: Record<
  LayananInklusif,
  { label: string; singkat: string; siapkan: string }
> = {
  NONE: {
    label: "Tidak perlu pendampingan khusus",
    singkat: "Umum",
    siapkan: "-",
  },
  TULI_JBI: {
    label: "Tuli / sulit mendengar - perlu Juru Bahasa Isyarat",
    singkat: "JBI",
    siapkan: "Jadwalkan Juru Bahasa Isyarat",
  },
  TULI_TEKS: {
    label: "Tuli / sulit mendengar - cukup lewat teks atau chat",
    singkat: "Teks",
    siapkan: "Sesi berbasis teks dan transkrip",
  },
  NETRA: {
    label: "Buta / low-vision - perlu penjelasan lisan & berkas terbaca pembaca layar",
    singkat: "Netra",
    siapkan: "Dokumen aksesibel, penjelasan lisan",
  },
  WICARA: {
    label: "Sulit bicara - perlu komunikasi tertulis",
    singkat: "Wicara",
    siapkan: "Jalur teks",
  },
  FISIK_MOBILITAS: {
    label: "Disabilitas fisik / pengguna kursi roda",
    singkat: "Mobilitas",
    siapkan: "Ruang lantai dasar, jalur bebas hambatan",
  },
  INTELEKTUAL: {
    label: "Perlu bahasa sederhana & waktu lebih lama",
    singkat: "Bahasa sederhana",
    siapkan: "Bahasa sederhana, tempo pelan, diulang",
  },
  MENTAL: {
    label: "Perlu suasana tenang",
    singkat: "Suasana tenang",
    siapkan: "Ruang tenang, hindari antrean ramai",
  },
  LANSIA: {
    label: "Lansia - perlu tempo perlahan & pendampingan",
    singkat: "Lansia",
    siapkan: "Bicara perlahan, bantuan pengisian",
  },
  PENDAMPING: {
    label: "Datang bersama pendamping / wali",
    singkat: "Pendamping",
    siapkan: "Kursi tambahan, izin pendamping",
  },
  LAINNYA: {
    label: "Kebutuhan lain - jelaskan pada kolom catatan",
    singkat: "Lainnya",
    siapkan: "Lihat catatan pemohon",
  },
};

/**
 * Skema nilai layanan inklusif.
 *
 * Menerima array. String tunggal ikut diterima lalu dibungkus jadi array,
 * supaya form lama yang masih memakai <select> tunggal tetap bekerja tanpa
 * perlu diubah lebih dulu.
 */
export const layananInklusifSchema = z
  .union([z.enum(LAYANAN_INKLUSIF), z.array(z.enum(LAYANAN_INKLUSIF))])
  .transform((nilai) => (Array.isArray(nilai) ? nilai : [nilai]))
  // "NONE" bersama pilihan lain tidak bermakna - buang saja.
  .transform((daftar) => {
    const unik = Array.from(new Set(daftar));
    return unik.length > 1 ? unik.filter((v) => v !== "NONE") : unik;
  })
  .optional();

/** Menandai apakah permohonan ini perlu perlakuan prioritas. */
export function perluPrioritas(nilai: unknown): boolean {
  if (!Array.isArray(nilai)) return false;
  return nilai.some((v) => typeof v === "string" && v !== "NONE");
}

/** Mengubah nilai tersimpan menjadi daftar label pendek untuk badge admin. */
export function labelInklusif(nilai: unknown): string[] {
  if (!Array.isArray(nilai)) return [];
  return nilai
    .filter((v): v is LayananInklusif => typeof v === "string" && v in LAYANAN_INKLUSIF_INFO)
    .filter((v) => v !== "NONE")
    .map((v) => LAYANAN_INKLUSIF_INFO[v].singkat);
}
