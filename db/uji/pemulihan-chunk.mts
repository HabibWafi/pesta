#!/usr/bin/env node
/**
 * Uji pemulihan otomatis saat berkas JavaScript (chunk) gagal dimuat.
 *
 *   npm run uji:chunk
 *
 * Tidak butuh server maupun database - murni logika. Yang dijaga di sini
 * ada dua, dan keduanya sama pentingnya:
 *
 *   1. Galat chunk HARUS terdeteksi, apa pun bunyi pesannya. Tiap browser
 *      dan tiap bundler menuliskannya berbeda; ketinggalan satu bentuk saja
 *      berarti sebagian warga tetap melihat layar galat merah.
 *
 *   2. Galat lain TIDAK BOLEH ikut tertangkap. Kalau pemeriksaannya terlalu
 *      longgar, kegagalan jaringan biasa atau bug aplikasi akan disamarkan
 *      jadi "situs baru diperbarui" - menyesatkan warga sekaligus
 *      menyembunyikan masalah yang sesungguhnya dari petugas.
 */

import { adalahGalatChunk, bolehMuatUlang } from "../../src/lib/pemulihan-chunk.js";

let gagal = 0;
function lapor(nama: string, lulus: boolean) {
  console.log(`  ${lulus ? "LULUS" : "GAGAL"}  ${nama}`);
  if (!lulus) gagal += 1;
}

function galat(pesan: string, nama?: string): Error {
  const e = new Error(pesan);
  if (nama) e.name = nama;
  return e;
}

console.log("\nUji pemulihan chunk\n");

// === A. Harus terdeteksi ===================================================
console.log("A. BENTUK GALAT CHUNK YANG HARUS DIKENALI");
lapor(
  "Turbopack - bentuk yang benar-benar dialami warga",
  adalahGalatChunk(
    galat("Failed to load chunk /_next/static/chunks/3u-k_q3ddelmv.js from module 64893")
  )
);
lapor("webpack - 'Loading chunk N failed'", adalahGalatChunk(galat("Loading chunk 123 failed")));
lapor("webpack - nama galat ChunkLoadError", adalahGalatChunk(galat("apa pun", "ChunkLoadError")));
lapor(
  "Chrome - 'Failed to fetch dynamically imported module'",
  adalahGalatChunk(galat("Failed to fetch dynamically imported module: https://x/y.js"))
);
lapor(
  "Firefox - 'error loading dynamically imported module'",
  adalahGalatChunk(galat("error loading dynamically imported module"))
);
lapor(
  "Safari - 'Importing a module script failed'",
  adalahGalatChunk(galat("Importing a module script failed."))
);
lapor(
  "dilempar sebagai string, bukan objek Error",
  adalahGalatChunk("Failed to load chunk /a/b.js")
);

// === B. TIDAK boleh tertangkap =============================================
console.log("\nB. GALAT LAIN YANG TIDAK BOLEH IKUT TERTANGKAP");
lapor("kegagalan jaringan biasa", !adalahGalatChunk(galat("Failed to fetch")));
lapor("galat aplikasi", !adalahGalatChunk(galat("Gagal menyimpan data ke server")));
lapor("TypeError acak", !adalahGalatChunk(new TypeError("Cannot read properties of undefined")));
lapor("null", !adalahGalatChunk(null));
lapor("undefined", !adalahGalatChunk(undefined));
lapor("objek kosong tanpa message", !adalahGalatChunk({}));

// === C. Pagar anti-putaran =================================================
//
// Bagian TERPENTING di berkas ini. Kalau versi barunya pun ternyata masih
// gagal, memuat ulang tanpa syarat menjebak warga dalam lingkaran reload
// tanpa akhir - jauh lebih buruk daripada satu layar galat yang jujur.
console.log("\nC. PAGAR ANTI-PUTARAN MUAT ULANG");

const simpanan = new Map<string, string>();
const pasangSimpanan = (impl: object) => {
  (globalThis as unknown as Record<string, unknown>).sessionStorage = impl;
};

pasangSimpanan({
  getItem: (k: string) => simpanan.get(k) ?? null,
  setItem: (k: string, v: string) => void simpanan.set(k, v),
});

lapor("percobaan pertama diizinkan", bolehMuatUlang() === true);
lapor("percobaan kedua DITOLAK - inilah yang mencegah reload tanpa henti", bolehMuatUlang() === false);
lapor("percobaan ketiga tetap ditolak", bolehMuatUlang() === false);

simpanan.set("pesta_pulih_chunk_terakhir", String(Date.now() - 20_000));
lapor("setelah jeda terlewat, boleh mencoba lagi", bolehMuatUlang() === true);

// Mode privat / cookie diblokir: sessionStorage melempar galat.
pasangSimpanan({
  getItem: () => {
    throw new Error("ditolak");
  },
  setItem: () => {
    throw new Error("ditolak");
  },
});
lapor(
  "sessionStorage ditolak -> TIDAK memuat ulang (tanpa pagar, jangan ambil risiko)",
  bolehMuatUlang() === false
);

console.log(gagal === 0 ? "\nSEMUA UJI LULUS.\n" : `\n${gagal} UJI GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
