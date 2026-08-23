import { getAdminSession } from "@/lib/auth";
import { ambilPengaturan, aktif } from "@/lib/content/settings";
import { EyeOff } from "lucide-react";

export type KunciFitur = "tampilan.sinta" | "tampilan.dashboard";

/**
 * Penjaga halaman fitur yang masih dikembangkan (/sinta, /dashboard).
 *
 * KENAPA HALAMANNYA IKUT DITUTUP, BUKAN CUMA TOMBOLNYA
 *
 * Menyembunyikan tombol di halaman depan tidak membuat halamannya hilang.
 * Tautannya bisa tersimpan di riwayat peramban, dibagikan lewat pesan, atau
 * terlanjur terindeks mesin pencari. Untuk sesuatu yang memang belum siap
 * dipakai warga, "tidak ada tombolnya" bukan berarti tersembunyi.
 *
 * TAPI PETUGAS TETAP HARUS BISA MEMERIKSANYA
 *
 * Fitur yang belum tayang justru perlu dibuka berkali-kali selama disiapkan.
 * Kalau ditutup untuk semua orang, satu-satunya cara memeriksanya adalah
 * menyalakannya untuk publik lebih dulu - persis yang ingin dihindari.
 *
 * Karena itu: warga tidak mendapat halamannya sama sekali, petugas yang
 * sudah login tetap masuk disertai penanda mencolok. Penandanya penting -
 * tanpa itu, mudah lupa bahwa yang dilihat petugas belum tentu yang dilihat
 * warga.
 */

export type KeadaanFitur = "tayang" | "pratayang" | "tertutup";

/**
 * Memutuskan siapa yang boleh melihat halaman ini.
 *
 * SENGAJA dipisah dari komponennya supaya halaman bisa memanggil
 * notFound() dari fungsi halamannya sendiri. Saat notFound() dipanggil dari
 * komponen anak yang async, Next kerap sudah mulai mengalirkan respons -
 * status 404-nya tidak lagi bisa dipasang, dan yang terkirim jadi 200
 * berisi halaman "tidak ditemukan". Mesin pencari membaca itu sebagai
 * halaman sah, tepat yang ingin dihindari untuk fitur yang belum terbit.
 */
export async function keadaanFitur(kunci: KunciFitur): Promise<KeadaanFitur> {
  const pengaturan = await ambilPengaturan();
  if (aktif(pengaturan[kunci])) return "tayang";
  return (await getAdminSession()) ? "pratayang" : "tertutup";
}

/**
 * Metadata halaman fitur, dengan `noindex` selama belum tayang.
 *
 * KENAPA PERLU, PADAHAL WARGA SUDAH DAPAT HALAMAN "TIDAK DITEMUKAN"
 *
 * notFound() di sini menghasilkan ISI halaman tidak-ditemukan, tapi status
 * HTTP-nya tetap 200. Penyebabnya: Next sudah mulai mengalirkan respons
 * sebelum pemeriksaan saklar selesai, sehingga statusnya tidak bisa diubah
 * lagi - `redirect()` pun mengalami hal yang sama, sudah dicoba.
 *
 * Bagi warga tidak ada bedanya: isi fiturnya tetap tidak terlihat. Yang
 * berbeda bagi MESIN PENCARI - halaman berstatus 200 bisa dianggap sah lalu
 * diindeks, dan URL fitur yang belum terbit justru muncul di hasil
 * pencarian. `noindex` menutup celah itu secara eksplisit, tidak
 * menggantungkan diri pada tebakan mesin pencari soal "soft 404".
 */
export async function metadataFitur(kunci: KunciFitur, judul: string) {
  const pengaturan = await ambilPengaturan();
  if (aktif(pengaturan[kunci])) return { title: judul };

  /*
   * Judulnya ikut dinetralkan, bukan hanya isinya.
   *
   * Sempat memakai judul asli di sini, dan itu bocor: badan halaman memang
   * sudah berganti jadi halaman tidak-ditemukan, tapi <title> masih berbunyi
   * "Dashboard Data Strategis BPS Musi Rawas". Nama fitur yang belum terbit
   * tetap terbaca di tab peramban dan oleh perayap mana pun yang membaca
   * judul - padahal justru itu yang ingin ditahan.
   */
  return {
    title: "Halaman Tidak Ditemukan",
    robots: { index: false, follow: false, nocache: true },
  };
}

/** Pita penanda bahwa halaman ini belum tayang untuk warga. */
export function PitaPratayang({ nama }: { nama: string }) {
  return (
    <div className="sticky top-0 z-[60] bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-md">
      <EyeOff className="w-4 h-4 shrink-0" />
      <span>
        Pratayang petugas &mdash; {nama} <u>belum tayang</u> untuk warga. Nyalakan di
        Kelola Konten &rsaquo; Tampilan bila sudah siap.
      </span>
    </div>
  );
}
