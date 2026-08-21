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
 *   npm run db:sql              tampilkan migration terbaru
 *   npm run db:sql -- 0001      tampilkan migration dengan awalan 0001
 *   npm run db:sql -- 0001 > siap.sql
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

const awalan = process.argv[2];
const berkas = awalan ? semua.find((f) => f.startsWith(awalan)) : semua.at(-1);

if (!berkas) {
  console.error(`Tidak ada migration berawalan "${awalan}". Yang tersedia:`);
  for (const f of semua) console.error("  " + f);
  process.exit(1);
}

const isi = readFileSync(join(dirMigrations, berkas), "utf8")
  .split(/-->\s*statement-breakpoint/)
  .map((bagian) => bagian.trim())
  .filter(Boolean)
  .join("\n\n");

console.error(`-- Sumber: db/migrations/${berkas}`);
console.error("-- Salin isi di bawah ini, jalankan di phpMyAdmin hPanel.\n");
console.log(isi);
