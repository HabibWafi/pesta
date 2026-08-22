/**
 * Mengimpor riwayat permohonan ViDCon 2025-2026 dari catatan Excel kantor.
 *
 *   node --env-file=.env --import tsx db/skrip/impor-vidcon-riwayat.mts
 *
 * SUMBER: db/skrip/data-vidcon-impor.json - dibangkitkan sekali dari berkas
 * Excel yang diberikan (Vidcon_2.xlsx, sheet "2025", "2026", dan "Sheet2"
 * untuk jam pada sheet 2025). Bukan data karangan - riwayat pertemuan
 * ViDCon yang sudah benar-benar terjadi di kantor.
 *
 * Field yang TIDAK ada di Excel (alamat, email) dibiarkan kosong, bukan
 * diisi tebakan - warga yang datanya diimpor tidak pernah menuliskan
 * keduanya di catatan kantor.
 *
 * Idempoten: dicocokkan lewat pasangan (nama, tanggal). Aman dijalankan
 * berulang - baris yang sudah ada dilewati, bukan diduplikasi.
 */

import { and, eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../../src/lib/db/index.js";
import { vidconRequests } from "../../src/lib/db/schema.js";

interface BarisImpor {
  nama: string;
  asalInstansi: string;
  cakupan: string;
  tanggal: string;
  jam: string;
  noHp: string;
  sumber: string;
}

async function main() {
  const dir = dirname(fileURLToPath(import.meta.url));
  const data: BarisImpor[] = JSON.parse(
    readFileSync(join(dir, "data-vidcon-impor.json"), "utf8")
  );

  console.log(`Mengimpor ${data.length} baris riwayat ViDCon...\n`);

  let baru = 0;
  let dilewat = 0;

  for (const b of data) {
    const [ada] = await db
      .select({ id: vidconRequests.id })
      .from(vidconRequests)
      .where(and(eq(vidconRequests.nama, b.nama), eq(vidconRequests.tanggal, b.tanggal)))
      .limit(1);

    if (ada) {
      dilewat += 1;
      continue;
    }

    await db.insert(vidconRequests).values({
      nama: b.nama,
      asalInstansi: b.asalInstansi,
      // Tidak ada di catatan Excel - dikosongkan, bukan ditebak.
      alamat: "",
      email: "",
      noHp: b.noHp,
      cakupan: b.cakupan,
      // Excel tidak memuat uraian terpisah dari topik; topiknya sendiri
      // sudah cukup jelas jadi dipakai ulang, bukan dikarang lebih rinci.
      deskripsi: b.cakupan,
      tanggal: b.tanggal,
      jam: b.jam,
      // Seluruh baris di sumber ini tanggalnya sudah lewat (per hari ini) -
      // konsultasinya sudah benar-benar berlangsung.
      status: "COMPLETED",
    });
    baru += 1;
  }

  console.log(`  Baru disisipkan : ${baru}`);
  console.log(`  Dilewati        : ${dilewat} (sudah ada, dicocokkan nama+tanggal)`);
  console.log("\nSelesai.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Impor gagal:", error);
  process.exit(1);
});
