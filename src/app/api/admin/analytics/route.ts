import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  ambilHalamanTerpopuler,
  ambilHarian,
  ambilRincianPerangkat,
  ringkasBulanan,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** Rentang bawaan: awal 2025 sampai hari ini. */
function rentangBawaan() {
  return {
    dari: "2025-01-01",
    sampai: new Date().toISOString().slice(0, 10),
  };
}

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const bawaan = rentangBawaan();
    const dari = searchParams.get("dari") || bawaan.dari;
    const sampai = searchParams.get("sampai") || bawaan.sampai;

    const [harian, halaman, rincian] = await Promise.all([
      ambilHarian(dari, sampai),
      ambilHalamanTerpopuler(8),
      ambilRincianPerangkat(),
    ]);

    const bulanan = ringkasBulanan(harian);

    const totalViews = harian.reduce((n, h) => n + h.views, 0);
    const totalUnik = harian.reduce((n, h) => n + h.uniqueVisitors, 0);
    const hariSimulasi = harian.filter((h) => h.isSeeded).length;
    const hariNyata = harian.length - hariSimulasi;

    const viewsNyata = harian.filter((h) => !h.isSeeded).reduce((n, h) => n + h.views, 0);

    return NextResponse.json({
      success: true,
      rentang: { dari, sampai },
      ringkasan: {
        totalViews,
        totalUnik,
        hariSimulasi,
        hariNyata,
        viewsNyata,
        rataPerHari: harian.length ? Math.round(totalViews / harian.length) : 0,
      },
      bulanan,
      harian,
      halaman,
      perangkat: rincian.perangkat,
      browser: rincian.browser,
    });
  } catch (error) {
    console.error("API Admin Analytics Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat statistik pengunjung" },
      { status: 500 }
    );
  }
}
