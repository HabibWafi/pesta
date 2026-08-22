/**
 * Pengaturan mode aksesibilitas inklusif.
 *
 * SATU-SATUNYA sumber kebenaran bentuk pengaturan, nilai bawaan, dan cara
 * menerapkannya ke DOM. Dipakai bersama oleh tiga tempat yang harus selalu
 * sepakat:
 *
 *   1. AccessibilityWidget.tsx   - panel yang dipakai pengunjung
 *   2. skrip inline di layout    - menerapkan pengaturan SEBELUM render
 *      pertama, supaya halaman tidak berkedip dari tampilan normal ke
 *      tampilan yang sudah disesuaikan
 *   3. globals.css               - kelas CSS yang benar-benar mengubah tampilan
 *
 * Kalau ketiganya tidak sepakat, gejalanya halus dan menyesatkan: pengaturan
 * tersimpan tapi tidak berlaku, atau berlaku lalu hilang sendiri sedetik
 * kemudian. Karena itu nama kelasnya dibangkitkan dari satu fungsi di sini,
 * bukan diketik ulang di masing-masing berkas.
 */

export const KUNCI_SIMPANAN = "pesta_aksesibilitas";

/** Pilihan penyesuaian warna. Hanya satu yang aktif pada satu waktu. */
export type ModeWarna =
  | "normal"
  | "monokrom"
  | "saturasi-rendah"
  | "saturasi-tinggi"
  | "kontras-tinggi"
  | "kontras-terang"
  | "kontras-gelap";

export interface Pengaturan {
  /** Persen ukuran teks, 100 - 200. */
  ukuranTeks: number;
  tebalTeks: boolean;
  tinggiBaris: boolean;
  jarakHuruf: boolean;
  fontDisleksia: boolean;
  sorotTautan: boolean;
  sorotJudul: boolean;
  /** Penanda fokus keyboard yang jauh lebih tegas. */
  fokusJelas: boolean;
  /** Garis pemandu baca yang mengikuti kursor. */
  penunjukBaca: boolean;
  kursorBesar: boolean;
  warna: ModeWarna;
  hentikanGerak: boolean;
  sembunyikanGambar: boolean;
  /** Menampilkan teks alternatif gambar sebagai tooltip. */
  tooltipGambar: boolean;
}

export const BAWAAN: Pengaturan = {
  ukuranTeks: 100,
  tebalTeks: false,
  tinggiBaris: false,
  jarakHuruf: false,
  fontDisleksia: false,
  sorotTautan: false,
  sorotJudul: false,
  fokusJelas: false,
  penunjukBaca: false,
  kursorBesar: false,
  warna: "normal",
  hentikanGerak: false,
  sembunyikanGambar: false,
  tooltipGambar: false,
};

// ---------------------------------------------------------------------------
// Profil - satu tombol yang menyalakan beberapa penyesuaian sekaligus
// ---------------------------------------------------------------------------

export type KunciProfil =
  | "aman-kejang"
  | "netra"
  | "low-vision"
  | "adhd"
  | "kognitif"
  | "motorik";

export interface Profil {
  kunci: KunciProfil;
  nama: string;
  keterangan: string;
  /** Penyesuaian yang dinyalakan profil ini. */
  ubah: Partial<Pengaturan>;
}

/**
 * Enam profil, disusun mengikuti kelompok kebutuhan yang lazim dipakai
 * perkakas aksesibilitas web.
 *
 * Profil TIDAK mengunci penyesuaian - setelah profil dinyalakan, tiap
 * saklar tetap bisa diubah sendiri. Profil hanya titik awal yang masuk akal,
 * supaya pengunjung tidak perlu menebak kombinasi mana yang cocok untuknya.
 */
export const PROFIL: Profil[] = [
  {
    kunci: "aman-kejang",
    nama: "Ramah Epilepsi",
    keterangan: "Menghentikan seluruh gerak dan meredam warna yang menyilaukan.",
    ubah: { hentikanGerak: true, warna: "saturasi-rendah" },
  },
  {
    kunci: "netra",
    nama: "Tunanetra",
    keterangan: "Menyiapkan halaman untuk pembaca layar dan navigasi keyboard.",
    ubah: { fokusJelas: true, sorotTautan: true, sorotJudul: true, tooltipGambar: true },
  },
  {
    kunci: "low-vision",
    nama: "Penglihatan Terbatas",
    keterangan: "Memperbesar teks dan menajamkan kontras agar lebih mudah dibaca.",
    ubah: {
      ukuranTeks: 130,
      tebalTeks: true,
      tinggiBaris: true,
      warna: "kontras-tinggi",
      fokusJelas: true,
    },
  },
  {
    kunci: "adhd",
    nama: "Ramah ADHD",
    keterangan: "Mengurangi gangguan visual dan menambah pemandu baca.",
    ubah: { hentikanGerak: true, penunjukBaca: true, warna: "saturasi-rendah" },
  },
  {
    kunci: "kognitif",
    nama: "Kognitif & Belajar",
    keterangan: "Memudahkan membaca dengan font khusus dan jarak yang lega.",
    ubah: {
      fontDisleksia: true,
      tinggiBaris: true,
      jarakHuruf: true,
      penunjukBaca: true,
      sorotJudul: true,
    },
  },
  {
    kunci: "motorik",
    nama: "Keterbatasan Motorik",
    keterangan: "Memperbesar kursor dan mempertegas sasaran yang bisa diklik.",
    ubah: { kursorBesar: true, fokusJelas: true, sorotTautan: true, ukuranTeks: 115 },
  },
];

// ---------------------------------------------------------------------------
// Penerapan ke DOM
// ---------------------------------------------------------------------------

/** Kelas yang mungkin dipasang di <html>. Dipakai juga untuk membersihkannya. */
const KELAS_WARNA: Record<ModeWarna, string> = {
  normal: "",
  monokrom: "a11y-monokrom",
  "saturasi-rendah": "a11y-saturasi-rendah",
  "saturasi-tinggi": "a11y-saturasi-tinggi",
  "kontras-tinggi": "a11y-kontras-tinggi",
  "kontras-terang": "a11y-kontras-terang",
  "kontras-gelap": "a11y-kontras-gelap",
};

const KELAS_SAKLAR: { kunci: keyof Pengaturan; kelas: string }[] = [
  { kunci: "tebalTeks", kelas: "a11y-tebal" },
  { kunci: "tinggiBaris", kelas: "a11y-tinggi-baris" },
  { kunci: "jarakHuruf", kelas: "a11y-jarak-huruf" },
  { kunci: "fontDisleksia", kelas: "a11y-font-disleksia" },
  { kunci: "sorotTautan", kelas: "a11y-sorot-tautan" },
  { kunci: "sorotJudul", kelas: "a11y-sorot-judul" },
  { kunci: "fokusJelas", kelas: "a11y-fokus-jelas" },
  { kunci: "kursorBesar", kelas: "a11y-kursor-besar" },
  { kunci: "hentikanGerak", kelas: "a11y-diam" },
  { kunci: "sembunyikanGambar", kelas: "a11y-sembunyikan-gambar" },
];

/**
 * Menerapkan pengaturan ke elemen <html>.
 *
 * Sengaja hanya menyentuh classList dan satu properti CSS - tidak menyimpan
 * apa pun, tidak membaca localStorage. Itu yang membuatnya bisa dipakai
 * langsung oleh skrip inline di <head>, di mana React belum ada sama sekali.
 */
export function terapkan(p: Pengaturan): void {
  const html = document.documentElement;

  for (const { kunci, kelas } of KELAS_SAKLAR) {
    html.classList.toggle(kelas, Boolean(p[kunci]));
  }

  for (const kelas of Object.values(KELAS_WARNA)) {
    if (kelas) html.classList.remove(kelas);
  }
  const kelasWarna = KELAS_WARNA[p.warna];
  if (kelasWarna) html.classList.add(kelasWarna);

  // Ukuran teks lewat properti khusus, bukan kelas - nilainya bertingkat
  // bebas 100-200, bukan beberapa pilihan tetap.
  html.style.setProperty("--a11y-skala-teks", `${p.ukuranTeks}%`);
}

/** Membaca pengaturan tersimpan, jatuh ke bawaan bila tidak ada atau rusak. */
export function baca(): Pengaturan {
  try {
    const mentah = localStorage.getItem(KUNCI_SIMPANAN);
    if (!mentah) return { ...BAWAAN };
    // Digabung dengan bawaan supaya penambahan opsi baru di versi berikutnya
    // tidak membuat pengaturan lama gagal dibaca.
    return { ...BAWAAN, ...(JSON.parse(mentah) as Partial<Pengaturan>) };
  } catch {
    return { ...BAWAAN };
  }
}

export function simpan(p: Pengaturan): void {
  try {
    localStorage.setItem(KUNCI_SIMPANAN, JSON.stringify(p));
  } catch {
    // Penyimpanan penuh atau diblokir - pengaturan tetap berlaku untuk sesi
    // ini, hanya tidak bertahan setelah halaman ditutup. Bukan alasan
    // menggagalkan apa pun.
  }
}
