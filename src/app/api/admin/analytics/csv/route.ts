import { getAdminSession } from "@/lib/auth";
import { ambilHarian } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Ekspor rollup harian sebagai CSV.
 *
 * Dibangkitkan sebagai string biasa - tidak perlu library untuk ini.
 *
 * Kolom `data_simulasi` sengaja ikut diekspor. Kalau berkas ini nanti
 * dibuka orang lain atau dilampirkan ke laporan, harus tetap terlihat baris
 * mana yang bukan angka nyata.
 */
function keCsv(baris: (string | number)[][]): string {
  const kutip = (nilai: string | number) => {
    const teks = String(nilai ?? "");
    return /[",\n;]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
  };
  return baris.map((r) => r.map(kutip).join(";")).join("\r\n");
}

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dari = searchParams.get("dari") || "2025-01-01";
  const sampai = searchParams.get("sampai") || new Date().toISOString().slice(0, 10);

  const harian = await ambilHarian(dari, sampai);

  const baris: (string | number)[][] = [
    ["tanggal", "kunjungan", "pengunjung_unik", "data_simulasi"],
    ...harian.map((h) => [h.tanggal, h.views, h.uniqueVisitors, h.isSeeded ? "YA" : "tidak"]),
  ];

  // BOM UTF-8 supaya Excel di Windows membaca huruf beraksen dengan benar.
  const isi = "﻿" + keCsv(baris);

  return new Response(isi, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pengunjung-pesta-${dari}-sd-${sampai}.csv"`,
    },
  });
}
