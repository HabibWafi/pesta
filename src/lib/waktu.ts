/**
 * Helper waktu untuk seluruh modul.
 *
 * ATURAN YANG MENGENDALIKAN SELURUH BERKAS INI:
 * Database menyimpan UTC. Konversi ke WIB hanya terjadi di batas tampilan.
 *
 * Alasannya bukan kerapian: server Hostinger kemungkinan besar UTC,
 * sedangkan komputer pengembangan memakai WIB. Kalau zona waktu server
 * ikut menentukan nilai yang tersimpan, kejadian yang sama akan tercatat
 * berbeda tujuh jam tergantung mesin mana yang menuliskannya - dan selisih
 * itu baru ketahuan saat ada yang menghitung laporan bulanan.
 */

export const APP_TZ = process.env.APP_TZ || "Asia/Jakarta";

/** Selisih WIB terhadap UTC, dalam menit. */
const OFFSET_WIB_MENIT = 7 * 60;

/**
 * Waktu sekarang, digeser ke WIB.
 *
 * HANYA untuk keperluan membaca komponen tanggal/jam WIB - misalnya
 * menentukan apakah sekarang jam layanan. JANGAN disimpan ke database:
 * yang disimpan selalu `new Date()` biasa, yaitu UTC.
 */
export function nowWib(): Date {
  const sekarang = new Date();
  return new Date(sekarang.getTime() + OFFSET_WIB_MENIT * 60_000);
}

/** Komponen waktu WIB dari sebuah instan. */
export function komponenWib(waktu: Date = new Date()): {
  tahun: number;
  bulan: number;
  tanggal: number;
  /** 0 = Minggu, 6 = Sabtu */
  hari: number;
  jam: number;
  menit: number;
  /** YYYY-MM-DD menurut WIB */
  tanggalIso: string;
} {
  const w = new Date(waktu.getTime() + OFFSET_WIB_MENIT * 60_000);
  return {
    tahun: w.getUTCFullYear(),
    bulan: w.getUTCMonth() + 1,
    tanggal: w.getUTCDate(),
    hari: w.getUTCDay(),
    jam: w.getUTCHours(),
    menit: w.getUTCMinutes(),
    tanggalIso: w.toISOString().slice(0, 10),
  };
}

/** Format waktu untuk dibaca petugas, mis. "21 Agu 2026, 14.30". */
export function formatWib(waktu: Date | string | null | undefined): string {
  if (!waktu) return "-";
  const d = typeof waktu === "string" ? new Date(waktu) : waktu;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Menambah menit ke sebuah waktu. Hasilnya tetap UTC. */
export function tambahMenit(menit: number, dari: Date = new Date()): Date {
  return new Date(dari.getTime() + menit * 60_000);
}

/** Menambah detik ke sebuah waktu. Hasilnya tetap UTC. */
export function tambahDetik(detik: number, dari: Date = new Date()): Date {
  return new Date(dari.getTime() + detik * 1000);
}

/** Apakah `waktu` lebih tua dari `menit` menit yang lalu. */
export function lebihTuaDari(menit: number, waktu: Date | null | undefined): boolean {
  if (!waktu) return true;
  return Date.now() - waktu.getTime() > menit * 60_000;
}

/**
 * Menyamarkan nomor telepon untuk log.
 *
 * ATURAN MUTLAK: nomor telepon lengkap tidak boleh pernah masuk berkas log.
 * Ini soal kepatuhan perlindungan data pribadi, dan mudah dilanggar tanpa
 * sengaja karena nomor sering ikut terbawa saat mencetak objek pesan.
 *
 *   6285169881015  ->  62851****015
 */
export function samarkanNomor(nomor: string | null | undefined): string {
  if (!nomor) return "(kosong)";
  const bersih = nomor.replace(/[^0-9]/g, "");
  if (bersih.length < 8) return "***";
  return `${bersih.slice(0, 5)}****${bersih.slice(-3)}`;
}
