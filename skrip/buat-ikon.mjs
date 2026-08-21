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

for (const { nama, sisi } of UKURAN) {
  const isi = await sharp(sumber)
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
