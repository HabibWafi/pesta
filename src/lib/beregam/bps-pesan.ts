import {
  ambilPublikasiTerbaru,
  ambilTabelStatistik,
  TAUTAN_PUBLIKASI,
  TAUTAN_TABEL,
  type Publikasi,
  type TabelStatistik,
} from "./bps-api";

/**
 * Menyusun jawaban menu 4 (publikasi) dan menu 5 (tabel statistik) dari data
 * resmi BPS.
 *
 * SELALU MENGEMBALIKAN JAWABAN YANG BERGUNA.
 *
 * Sebelumnya kedua menu ini membalas dengan penanda "[ISI: sebutkan
 * publikasi unggulan...]" - teks catatan untuk petugas yang tidak pernah
 * dilengkapi, dan warga sungguhan membacanya. Itu lebih buruk daripada tidak
 * menjawab: warga tahu ada yang tidak beres, tapi tidak tahu harus apa.
 *
 * Karena itu tidak ada satu pun jalur di berkas ini yang bisa berakhir tanpa
 * jawaban. Bila Web API BPS tidak bisa dihubungi - kunci belum diisi,
 * jaringan bermasalah, atau BPS sedang gangguan - yang dikirim adalah
 * tautan resmi berikut penjelasan singkat. Berkurang kenyamanannya, tapi
 * warga tetap sampai ke tujuan.
 */

/** Berapa banyak yang muat dalam satu pesan WhatsApp tanpa terasa membanjiri. */
const MAKS_PUBLIKASI = 8;
const MAKS_TABEL = 10;

function potong(teks: string, maks: number): string {
  return teks.length > maks ? `${teks.slice(0, maks - 1).trimEnd()}…` : teks;
}

/** Jawaban menu 4 - publikasi & rilis terbaru. */
export async function pesanPublikasi(): Promise<string> {
  let daftar: Publikasi[] | null = null;
  try {
    daftar = await ambilPublikasiTerbaru();
  } catch (error) {
    console.error("[bps] gagal menyiapkan daftar publikasi:", error);
  }

  if (!daftar || daftar.length === 0) {
    return (
      "📚 *Publikasi & Rilis Terbaru*\n\n" +
      "Seluruh publikasi dan Berita Resmi Statistik BPS Kabupaten Musi Rawas " +
      "dapat diunduh *gratis* di:\n" +
      `${TAUTAN_PUBLIKASI}\n\n` +
      "Di sana tersedia antara lain Kabupaten Musi Rawas Dalam Angka, PDRB, " +
      "Indeks Pembangunan Manusia, Statistik Potensi Desa, dan Indikator " +
      "Kesejahteraan Rakyat.\n\n" +
      "Butuh bantuan mencari publikasi tertentu? Ketik *8* untuk bicara dengan petugas kami."
    );
  }

  const baris = daftar.slice(0, MAKS_PUBLIKASI).map((p, i) => {
    const tanggal = p.tanggal ? `\n   🗓️ ${p.tanggal}` : "";
    const tautan = p.tautan ? `\n   ⬇️ ${p.tautan}` : "";
    return `*${i + 1}.* ${potong(p.judul, 90)}${tanggal}${tautan}`;
  });

  return (
    "📚 *Publikasi Terbaru BPS Kabupaten Musi Rawas*\n\n" +
    `${baris.join("\n\n")}\n\n` +
    `Seluruh ${daftar.length} publikasi (gratis) ada di:\n${TAUTAN_PUBLIKASI}\n\n` +
    "Ketik *menu* untuk kembali, atau *8* untuk bicara dengan petugas."
  );
}

/** Jawaban menu 5 - tabel & indikator statistik. */
export async function pesanTabelStatistik(): Promise<string> {
  let daftar: TabelStatistik[] | null = null;
  try {
    daftar = await ambilTabelStatistik();
  } catch (error) {
    console.error("[bps] gagal menyiapkan daftar tabel statistik:", error);
  }

  if (!daftar || daftar.length === 0) {
    return (
      "📈 *Tabel & Indikator Statistik*\n\n" +
      "Tabel indikator utama Kabupaten Musi Rawas - jumlah penduduk, PDRB, " +
      "inflasi, kemiskinan, ketenagakerjaan, dan lainnya - tersedia di:\n" +
      `${TAUTAN_TABEL}\n\n` +
      "Untuk data yang lebih rinci atau belum tersedia di sana, silakan ajukan " +
      "lewat menu *2* (Permintaan Data), atau ketik *8* untuk bicara langsung " +
      "dengan petugas kami."
    );
  }

  const baris = daftar.slice(0, MAKS_TABEL).map((t, i) => {
    const diperbarui = t.diperbarui ? ` _(diperbarui ${t.diperbarui})_` : "";
    return `*${i + 1}.* ${potong(t.judul, 85)}${diperbarui}`;
  });

  return (
    "📈 *Tabel Statistik BPS Kabupaten Musi Rawas*\n\n" +
    `${baris.join("\n")}\n\n` +
    `Angka lengkapnya bisa dilihat dan diunduh di:\n${TAUTAN_TABEL}\n\n` +
    "Butuh data yang belum ada di daftar itu? Ajukan lewat menu *2* " +
    "(Permintaan Data), atau ketik *8* untuk bicara dengan petugas."
  );
}
