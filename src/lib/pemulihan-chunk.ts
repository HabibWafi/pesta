/**
 * Pemulihan otomatis saat berkas JavaScript (chunk) gagal dimuat.
 *
 * KENAPA INI ADA
 *
 * Nama berkas chunk mengandung sidik isi, jadi berubah total setiap kali
 * situs di-build ulang. Saat versi baru ter-deploy, berkas versi lama
 * DIHAPUS dari server.
 *
 * Akibatnya: pengunjung yang halamannya sudah terbuka sejak sebelum deploy
 * masih memegang HTML lama, yang menyebut nama-nama chunk lama. Begitu ia
 * menggulir ke bagian bawah halaman atau menekan tombol yang membuka
 * formulir, browser meminta chunk yang sudah tidak ada lagi - dan dapat 404.
 *
 * Ini BUKAN kerusakan server dan bukan bug di kode. Ini sifat bawaan
 * deploy: sesaat setelah rilis, selalu ada jendela waktu ketika sebagian
 * pengunjung memegang versi lama. Yang salah bukan kejadiannya, melainkan
 * membiarkan warga melihat layar galat merah dan menyangka layanannya rusak,
 * padahal cukup dimuat ulang.
 *
 * Halaman depan PESTA sangat rentan karena isinya sengaja dipecah jadi
 * banyak chunk (lihat catatan di HomeClient.tsx) - tiap bagian di bawah
 * layar dan tiap formulir adalah berkas terpisah yang baru diambil saat
 * dibutuhkan. Itu bagus untuk kecepatan, tapi berarti jendela rentannya
 * bukan cuma saat halaman pertama dibuka.
 */

/**
 * Apakah galat ini soal chunk yang gagal diambil?
 *
 * Bunyi pesannya berbeda-beda antar bundler dan browser, dan ketiganya
 * memang pernah muncul di lapangan - jadi dicocokkan ke semuanya, bukan
 * hanya ke bentuk yang kebetulan terlihat pertama kali:
 *
 *   Turbopack : "Failed to load chunk /_next/static/chunks/....js"
 *   webpack   : "Loading chunk 123 failed" / nama galat "ChunkLoadError"
 *   Chrome    : "Failed to fetch dynamically imported module"
 *   Firefox   : "error loading dynamically imported module"
 *   Safari    : "Importing a module script failed"
 */
export function adalahGalatChunk(galat: unknown): boolean {
  if (!galat) return false;

  const nama = (galat as { name?: unknown }).name;
  if (typeof nama === "string" && nama === "ChunkLoadError") return true;

  const pesan =
    typeof galat === "string"
      ? galat
      : typeof (galat as { message?: unknown }).message === "string"
        ? ((galat as { message: string }).message)
        : "";

  if (!pesan) return false;

  const p = pesan.toLowerCase();
  return (
    p.includes("failed to load chunk") ||
    p.includes("loading chunk") ||
    p.includes("chunkloaderror") ||
    p.includes("failed to fetch dynamically imported module") ||
    p.includes("error loading dynamically imported module") ||
    p.includes("importing a module script failed")
  );
}

const KUNCI_PERCOBAAN = "pesta_pulih_chunk_terakhir";

/** Jeda minimal antar percobaan muat ulang otomatis. */
const JEDA_MS = 15_000;

/**
 * Apakah boleh memuat ulang sekarang?
 *
 * PAGAR ANTI-PUTARAN. Kalau versi baru pun ternyata masih gagal - misalnya
 * deploy-nya memang rusak, atau internet pengunjung putus di tengah - memuat
 * ulang tanpa syarat akan menjebak orang dalam lingkaran reload tanpa akhir,
 * yang jauh lebih buruk daripada satu layar galat yang jujur. Karena itu
 * hanya boleh sekali per rentang waktu; sesudah itu galatnya ditampilkan apa
 * adanya dan warga memutuskan sendiri.
 *
 * Memakai sessionStorage, bukan localStorage: penandanya memang hanya
 * relevan untuk tab ini dan wajar hilang saat tab ditutup.
 */
export function bolehMuatUlang(): boolean {
  try {
    const terakhir = Number(sessionStorage.getItem(KUNCI_PERCOBAAN) ?? 0);
    if (Number.isFinite(terakhir) && Date.now() - terakhir < JEDA_MS) return false;
    sessionStorage.setItem(KUNCI_PERCOBAAN, String(Date.now()));
    return true;
  } catch {
    // sessionStorage bisa ditolak (mode privat, cookie diblokir). Tanpa
    // penanda, pagar anti-putaran tidak bisa dijamin - jadi jangan memuat
    // ulang sama sekali. Lebih baik warga melihat galat lalu menekan tombol
    // sendiri daripada berisiko terjebak reload berulang.
    return false;
  }
}
