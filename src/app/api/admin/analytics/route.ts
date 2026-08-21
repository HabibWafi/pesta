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
      ambilHalamanTerpopuler(dari, sampai, 8),
      ambilRincianPerangkat(),
    ]);

    const bulanan = ringkasBulanan(harian);

    const totalViews = harian.reduce((n, h) => n + h.views, 0);
    const totalUnik = harian.reduce((n, h) => n + h.uniqueVisitors, 0);

    // Bulan paling ramai - biasanya inilah yang ditanyakan lebih dulu
    // daripada angka totalnya.
    const puncak = bulanan.reduce<{ bulan: string; views: number } | null>(
      (t, b) => (!t || b.views > t.views ? { bulan: b.bulan, views: b.views } : t),
      null
    );

    return NextResponse.json({
      success: true,
      rentang: { dari, sampai },
      ringkasan: {
        totalViews,
        totalUnik,
        jumlahHari: harian.length,
        jumlahBulan: bulanan.length,
        rataPerHari: harian.length ? Math.round(totalViews / harian.length) : 0,
        puncak,
      },
      bulanan,
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
