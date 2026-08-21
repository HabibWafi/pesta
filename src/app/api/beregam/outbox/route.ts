import { NextResponse } from "next/server";
import { otorisasiWorker } from "@/lib/beregam/auth";
import { claimOutboxBatch, ambilHealth, perbaruiSewa } from "@/lib/beregam/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Worker mengambil antrean kirim.
 *
 * Baris dikunci di tingkat database sebelum dikembalikan, sehingga dua
 * worker yang polling bersamaan tidak pernah mendapat baris yang sama.
 * Ini yang membuat PC cadangan aman dinyalakan berbarengan.
 */
export async function GET(req: Request) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;

  try {
    // Saklar darurat: admin bisa menghentikan seluruh pengiriman dari panel.
    const health = await ambilHealth();
    if (!health.botEnabled) {
      return NextResponse.json({ items: [], serverTime: new Date().toISOString() });
    }

    // Hanya pemegang sewa yang boleh mengirim. Worker lain menganggur.
    if (!(await perbaruiSewa(izin.workerId))) {
      return NextResponse.json({ items: [], serverTime: new Date().toISOString() });
    }

    const limit = Number(new URL(req.url).searchParams.get("limit") ?? 5);
    const items = await claimOutboxBatch(limit, izin.workerId);

    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        waId: i.waId,
        type: i.type,
        payload: i.payload,
        delaySeconds: 0,
      })),
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[beregam] gagal mengambil outbox:", error);
    return NextResponse.json({ ok: false, message: "Gagal mengambil antrean." }, { status: 500 });
  }
}
