import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

/**
 * Pengaturan situs: konten yang berubah-ubah, disimpan di database supaya
 * bisa diubah dari admin tanpa deploy.
 *
 * Nilai bawaan di bawah ini adalah teks yang sebelumnya di-hardcode di
 * komponen. Ia dipakai sebagai cadangan bila kunci belum ada di database,
 * sehingga situs tidak pernah tampil kosong walau tabelnya belum diisi.
 */

export type GrupSetting = "kontak" | "peta" | "tampilan" | "istilah";

type Definisi = {
  grup: GrupSetting;
  label: string;
  bawaan: string;
  /** Petunjuk singkat untuk petugas yang mengisinya di admin. */
  bantuan?: string;
  /** Bentuk isian di halaman admin. */
  jenis?: "teks" | "teks-panjang" | "saklar" | "pilihan";
  pilihan?: { nilai: string; label: string }[];
};

export const DEFINISI_SETTING = {
  // --- Kontak & alamat kantor ---
  "kontak.alamat": {
    grup: "kontak",
    label: "Alamat kantor",
    jenis: "teks-panjang",
    bawaan:
      "Jl. Pangeran Mohammad Amin, Komplek Perkantoran Agropolitan Muara Beliti, Musi Rawas, Sumatera Selatan",
  },
  "kontak.email": {
    grup: "kontak",
    label: "Email resmi",
    bawaan: "bps1605@bps.go.id",
  },
  "kontak.telepon": {
    grup: "kontak",
    label: "Telepon kantor",
    bawaan: "(0733) 4540056",
  },
  "kontak.whatsapp": {
    grup: "kontak",
    label: "WhatsApp layanan",
    bantuan: "Nomor Beregam. Format 62xxx, tanpa tanda + atau spasi.",
    bawaan: "6285169881015",
  },
  "kontak.jam_layanan": {
    grup: "kontak",
    label: "Jam layanan PST",
    jenis: "teks-panjang",
    bawaan: "Senin - Kamis: 08.00 - 15.30 WIB\nJumat: 08.00 - 16.00 WIB",
  },

  // --- Peta lokasi ---
  "peta.jenis": {
    grup: "peta",
    label: "Jenis peta",
    jenis: "pilihan",
    bantuan:
      "Google Hybrid tampil seperti saat membuka Google Maps. Tanpa API key " +
      "pun tetap jalan lewat embed klasik; isi GOOGLE_MAPS_EMBED_KEY di .env " +
      "bila ingin memakai jalur resmi yang lebih stabil.",
    pilihan: [
      { nilai: "google", label: "Google Hybrid (satelit + label)" },
      { nilai: "osm", label: "OpenStreetMap (tanpa API key, tanpa pelacakan)" },
    ],
    bawaan: "google",
  },
  "peta.lat": {
    grup: "peta",
    label: "Lintang (latitude)",
    bantuan: "Titik Kantor BPS Kabupaten Musi Rawas.",
    bawaan: "-3.2348302",
  },
  "peta.lng": {
    grup: "peta",
    label: "Bujur (longitude)",
    bawaan: "103.0115801",
  },
  "peta.zoom": {
    grup: "peta",
    label: "Tingkat perbesaran",
    bantuan: "Angka 1 (dunia) sampai 21 (paling dekat). Wajar: 17-19.",
    bawaan: "18",
  },
  "peta.judul": {
    grup: "peta",
    label: "Nama lokasi pada peta",
    bawaan: "Kantor BPS Kabupaten Musi Rawas",
  },

  // --- Saklar tampil tiap bagian landing ---
  "tampilan.testimoni": {
    grup: "tampilan",
    label: "Tampilkan bagian Testimoni",
    jenis: "saklar",
    bantuan:
      "Dimatikan sampai ada testimoni asli. Isi dulu di tab Testimoni, baru nyalakan.",
    bawaan: "0",
  },
  "tampilan.faq": {
    grup: "tampilan",
    label: "Tampilkan bagian FAQ",
    jenis: "saklar",
    bawaan: "1",
  },
  "tampilan.peta": {
    grup: "tampilan",
    label: "Tampilkan peta lokasi",
    jenis: "saklar",
    bawaan: "1",
  },
  "tampilan.inklusi": {
    grup: "tampilan",
    label: "Tampilkan bagian Layanan Inklusif",
    jenis: "saklar",
    bawaan: "1",
  },

  // --- Label istilah ---
  // Dipisah ke pengaturan supaya perubahan pembahasaan berikutnya cukup
  // diedit di admin, tidak perlu deploy.
  "istilah.aduan_tab": {
    grup: "istilah",
    label: "Label tab formulir aduan",
    bawaan: "Form Aduan",
  },
  "istilah.aduan_kartu": {
    grup: "istilah",
    label: "Judul kartu aduan di halaman kontak",
    bawaan: "Form Aduan",
  },
  "istilah.aduan_judul": {
    grup: "istilah",
    label: "Judul lengkap kanal aduan",
    bawaan: "Aduan Internal BPS Musi Rawas",
  },
  "istilah.aduan_tombol": {
    grup: "istilah",
    label: "Teks tombol aduan",
    bawaan: "Buat Aduan",
  },
  "istilah.aduan_sukses": {
    grup: "istilah",
    label: "Pesan setelah aduan terkirim",
    bawaan: "Aduan Berhasil Terkirim!",
  },
} as const satisfies Record<string, Definisi>;

export type KunciSetting = keyof typeof DEFINISI_SETTING;

export type Pengaturan = Record<KunciSetting, string>;

/** Nilai bawaan lengkap, dipakai bila database belum diisi. */
export function pengaturanBawaan(): Pengaturan {
  const hasil = {} as Pengaturan;
  for (const [kunci, def] of Object.entries(DEFINISI_SETTING)) {
    hasil[kunci as KunciSetting] = def.bawaan;
  }
  return hasil;
}

/**
 * Membaca seluruh pengaturan, digabung dengan nilai bawaan.
 *
 * Di-cache supaya setiap pengunjung tidak memukul MySQL. Ini penting:
 * Hostinger Business membatasi Entry Process, dan halaman utama adalah
 * halaman yang paling sering dibuka.
 */
export const ambilPengaturan = unstable_cache(
  async (): Promise<Pengaturan> => {
    const hasil = pengaturanBawaan();
    try {
      const baris = await db
        .select({ key: siteSettings.key, value: siteSettings.value })
        .from(siteSettings);
      for (const { key, value } of baris) {
        if (key in hasil && value !== null) {
          hasil[key as KunciSetting] = value;
        }
      }
    } catch (error) {
      // Database bermasalah bukan alasan halaman publik ikut mati.
      // Tampilkan nilai bawaan, catat kesalahannya.
      console.error("Gagal membaca site_settings, memakai nilai bawaan:", error);
    }
    return hasil;
  },
  ["site-settings"],
  { tags: ["konten"], revalidate: 300 }
);

/** Membaca saklar tampil sebagai boolean. */
export function aktif(nilai: string | undefined): boolean {
  return nilai === "1" || nilai === "true";
}
