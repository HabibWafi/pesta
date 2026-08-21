/**
 * Pembangkit CSV.
 *
 * Ditulis sendiri, tanpa library. Untuk mengubah baris menjadi teks
 * berpemisah, sebuah dependency baru tidak sebanding dengan tiga puluh
 * baris kode.
 *
 * Pemisahnya titik koma, bukan koma: Excel berbahasa Indonesia memakai koma
 * sebagai pemisah desimal, sehingga berkas berpemisah koma akan menumpuk
 * jadi satu kolom saat dibuka petugas.
 */

export type NilaiSel = string | number | boolean | Date | null | undefined;

function selKeTeks(nilai: NilaiSel): string {
  if (nilai === null || nilai === undefined) return "";
  if (nilai instanceof Date) {
    // Format yang langsung terbaca petugas, bukan ISO mentah.
    return nilai.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "short",
      timeStyle: "short",
    });
  }
  if (typeof nilai === "boolean") return nilai ? "ya" : "tidak";
  return String(nilai);
}

function kutip(teks: string): string {
  // Awalan yang bisa ditafsirkan Excel sebagai rumus dilucuti. Tanpa ini,
  // isian warga yang diawali "=" akan dieksekusi saat berkas dibuka.
  const aman = /^[=+\-@\t\r]/.test(teks) ? `'${teks}` : teks;
  return /[";\n\r]/.test(aman) ? `"${aman.replace(/"/g, '""')}"` : aman;
}

/** Membangun isi CSV lengkap dengan BOM UTF-8 agar Excel membaca aksara dengan benar. */
export function bangunCsv(judul: string[], baris: NilaiSel[][]): string {
  const semua = [judul, ...baris.map((r) => r.map(selKeTeks))];
  const teks = semua.map((r) => r.map((sel) => kutip(String(sel))).join(";")).join("\r\n");
  return "﻿" + teks;
}

/** Membungkus CSV sebagai unduhan berkas. */
export function responsCsv(namaBerkas: string, isi: string): Response {
  return new Response(isi, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
    },
  });
}

/** Stempel tanggal untuk nama berkas: 2026-08-21 */
export function stempelTanggal(): string {
  return new Date().toISOString().slice(0, 10);
}
