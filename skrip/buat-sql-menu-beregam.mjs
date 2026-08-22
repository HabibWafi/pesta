#!/usr/bin/env node
/**
 * Membangkitkan SQL siap-tempel phpMyAdmin dari isi beregam_faq lokal
 * saat ini, untuk menyamakan menu bot di Hostinger.
 *
 *   node --env-file=.env --import tsx skrip/buat-sql-menu-beregam.mjs
 *
 * Sekali pakai - dipakai setelah db/skrip/perbarui-menu-beregam.mts
 * dijalankan di lokal, untuk menghasilkan SQL yang setara bagi produksi
 * (yang tidak bisa dijalankan skrip Node langsung, hanya lewat phpMyAdmin).
 */
import { asc } from "drizzle-orm";
import { db } from "../src/lib/db/index.js";
import { beregamFaq } from "../src/lib/beregam/db/schema.js";

function esc(nilai) {
  return "'" + String(nilai).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

const baris = await db.select().from(beregamFaq).orderBy(asc(beregamFaq.id));

const potongan = [
  "-- Sinkronisasi menu bot Beregam ke naskah baru (8 menu, penomoran baru).",
  "-- Dibangkitkan dari database lokal - aman dijalankan berulang di phpMyAdmin.",
  "",
];

for (const b of baris) {
  if (b.id <= 6) {
    potongan.push(
      `UPDATE beregam_faq SET menu_key=${esc(b.menuKey)}, title=${esc(b.title)}, ` +
        `answer=${esc(b.answer)}, sort_order=${b.sortOrder} WHERE id=${b.id};`
    );
  } else {
    potongan.push(
      `INSERT INTO beregam_faq (id, menu_key, title, answer, sort_order, is_active) ` +
        `SELECT ${b.id}, ${esc(b.menuKey)}, ${esc(b.title)}, ${esc(b.answer)}, ${b.sortOrder}, 1 ` +
        `WHERE NOT EXISTS (SELECT 1 FROM beregam_faq WHERE id=${b.id});`
    );
  }
}

console.log(potongan.join("\n"));
process.exit(0);
