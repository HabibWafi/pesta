#!/usr/bin/env node
/**
 * Menyiapkan berkas migration Drizzle agar siap dijalankan di phpMyAdmin.
 *
 * drizzle-kit menyisipkan penanda `--> statement-breakpoint` di antara
 * pernyataan. Penanda itu BUKAN komentar SQL yang sah - komentar MySQL butuh
 * spasi setelah `--`, sedangkan penanda ini langsung diikuti `>`. Menempelkan
 * berkas mentah ke phpMyAdmin akan gagal dengan pesan sintaks yang
 * membingungkan.
 *
 * Pakai:
 *   npm run db:sql                  migration terbaru saja
 *   npm run db:sql -- 0002          migration dengan awalan 0002
 *   npm run db:sql -- sejak 0001    gabungkan 0001 sampai terakhir
 *   npm run db:sql -- semua         semua migration, untuk pemasangan baru
 *
 *   npm run db:sql -- sejak 0001 > untuk-hostinger.sql
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dirMigrations = join(dirname(fileURLToPath(import.meta.url)), "migrations");

const semua = readdirSync(dirMigrations)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (semua.length === 0) {
  console.error("Belum ada berkas migration. Jalankan: npm run db:generate");
  process.exit(1);
}

/** Membuang penanda breakpoint agar isinya bisa dijalankan apa adanya. */
function bersihkan(namaBerkas) {
  return readFileSync(join(dirMigrations, namaBerkas), "utf8")
    .split(/-->\s*statement-breakpoint/)
    .map((bagian) => bagian.trim())
    .filter(Boolean)
    .join("\n\n");
}

const argumen = process.argv.slice(2);
let dipilih;

if (argumen[0] === "semua") {
  dipilih = semua;
} else if (argumen[0] === "sejak") {
  const awalan = argumen[1];
  const mulai = semua.findIndex((f) => f.startsWith(awalan));
  if (mulai === -1) {
    console.error(`Tidak ada migration berawalan "${awalan}". Yang tersedia:`);
    for (const f of semua) console.error("  " + f);
    process.exit(1);
  }
  dipilih = semua.slice(mulai);
} else if (argumen[0]) {
  const satu = semua.find((f) => f.startsWith(argumen[0]));
  if (!satu) {
    console.error(`Tidak ada migration berawalan "${argumen[0]}". Yang tersedia:`);
    for (const f of semua) console.error("  " + f);
    process.exit(1);
  }
  dipilih = [satu];
} else {
  dipilih = [semua.at(-1)];
}

console.error(`-- ${dipilih.length} migration disiapkan:`);
for (const f of dipilih) console.error(`--   ${f}`);
console.error("-- Salin isi di bawah ini, jalankan di phpMyAdmin hPanel.");
console.error("-- Jalankan berurutan dari atas ke bawah, jangan diacak.\n");

const bagian = dipilih.map(
  (f) => `-- =====================================================\n` +
         `-- ${f}\n` +
         `-- =====================================================\n` +
         bersihkan(f)
);

console.log(bagian.join("\n\n"));
