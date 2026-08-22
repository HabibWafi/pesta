#!/usr/bin/env node
/**
 * Membangkitkan ikon situs dari logo sumber.
 *
 *   npm run buat:ikon
 *
 * KENAPA INI PERLU
 *
 * Logo sumber berukuran 1024x1024 dan beratnya 261 KB. Berkas itu sempat
 * dipakai langsung sebagai favicon lewat `metadata.icons`, padahal favicon
 * ditampilkan pada 16-32 piksel dan diminta di SETIAP halaman. Pengukuran
 * Lighthouse menemukannya sebagai satu-satunya aset tanpa header cache -
 * sekaligus aset terbesar di seluruh halaman.
 *
 * Keluarannya memakai konvensi berkas Next App Router, jadi tidak perlu ada
 * yang menuliskan `metadata.icons` secara manual:
 *
 *   src/app/icon.png        32x32   favicon peramban
 *   src/app/apple-icon.png  180x180 ikon layar utama iOS
 *
 * Next menyisipkan sidik isi berkas ke URL-nya, sehingga aman di-cache
 * selamanya dan otomatis berganti URL ketika logonya diganti.
 *
 * HANYA LAMBANG, BUKAN LOGO LENGKAP
 *
 * Logo sumber adalah lambang (orang + grafik + gelembung bicara) DIIKUTI
 * wordmark "PeSTa" dan tagline di bawahnya, disusun vertikal dalam satu
 * kanvas persegi. Me-resize seluruh kanvas ke 32px membuat wordmark-nya
 * mengecil sampai tidak terbaca sama sekali - favicon di bilah tab jauh
 * lebih kecil daripada ikon aplikasi, dan nyaris setiap situs sengaja
 * memakai lambang saja untuk ukuran sekecil itu, bukan logo penuh.
 *
 * TINGGI_LAMBANG di bawah adalah perkiraan proporsi tinggi lambang
 * terhadap tinggi kanvas PADA LOGO SAAT INI - sesuaikan kalau logo sumber
 * diganti dengan tata letak yang berbeda (mis. wordmark di samping,
 * bukan di bawah).
 *
 * Jalankan ulang setiap kali logo sumber berubah.
 */

import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const akar = join(dirname(fileURLToPath(import.meta.url)), "..");
const sumber = join(akar, "public/images/pesta_logo.png");
const tujuanDir = join(akar, "src/app");

const UKURAN = [
  { nama: "icon.png", sisi: 32 },
  { nama: "apple-icon.png", sisi: 180 },
];

/** Proporsi tinggi lambang terhadap tinggi kanvas penuh - lihat catatan di atas. */
const TINGGI_LAMBANG = 0.6;

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "Modul sharp tidak tersedia.\n" +
      "sharp ikut terpasang bersama Next.js; kalau hilang, jalankan: npm install"
  );
  process.exit(1);
}

try {
  await stat(sumber);
} catch {
  console.error(`Logo sumber tidak ditemukan: ${sumber}`);
  process.exit(1);
}

const asal = await sharp(sumber).metadata();
console.log(`Sumber: ${asal.width}x${asal.height} ${asal.format}`);

await mkdir(tujuanDir, { recursive: true });

// Potong bagian atas kanvas (lambang saja, tanpa wordmark), lalu pangkas
// sisa latar putih di sekelilingnya supaya lambangnya memenuhi kanvas
// ikon - bukan mengambang kecil di tengah kotak kosong.
const tinggiPotong = Math.round((asal.height ?? 0) * TINGGI_LAMBANG);
const potonganAtas = await sharp(sumber)
  .extract({ left: 0, top: 0, width: asal.width, height: tinggiPotong })
  .toBuffer();
const lambang = await sharp(potonganAtas)
  .trim({ background: "#ffffff", threshold: 8 })
  .toBuffer();

for (const { nama, sisi } of UKURAN) {
  const isi = await sharp(lambang)
    .resize(sisi, sisi, {
      fit: "contain",
      // Latar transparan, bukan putih: favicon tampil di atas bilah tab
      // yang warnanya berbeda-beda antar peramban dan antar tema.
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  const tujuan = join(tujuanDir, nama);
  await writeFile(tujuan, isi);
  console.log(`  ${nama.padEnd(16)} ${sisi}x${sisi}  ${(isi.length / 1024).toFixed(1)} KB`);
}

console.log("\nSelesai. Hapus metadata.icons dari src/app/layout.tsx bila masih ada -");
console.log("konvensi berkas sudah menanganinya.");
