import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamHealth } from "@/lib/beregam/db/schema";
import { otorisasiWorker } from "@/lib/beregam/auth";
import { heartbeatRequestSchema } from "@/lib/beregam/contracts";
import { ambilHealth, perbaruiSewa } from "@/lib/beregam/db/queries";
import { runMaintenanceBilaPerlu } from "@/lib/beregam/services/maintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Denyut nadi worker - DAN pemicu pemeliharaan.
 *
 * Endpoint ini melakukan dua hal sekaligus, dan itu disengaja. Worker sudah
 * memanggil tiap 60 detik, jadi menumpangkan pemeliharaan di sini
 * menghilangkan kebutuhan cron sama sekali - satu hal lagi yang tidak perlu
 * dikonfigurasi, tidak perlu dipantau, dan tidak bisa lupa dinyalakan.
 */
export async function POST(req: Request) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;

  try {
    const data = heartbeatRequestSchema.parse(await req.json());

    await ambilHealth();
    await db
      .update(beregamHealth)
      .set({
        workerLastSeenAt: new Date(),
        waSessionStatus: data.waSessionStatus ?? null,
        meta: {
          workerVersion: data.workerVersion ?? null,
          uptime: data.uptime ?? null,
          ...(data.meta ?? {}),
        },
      })
      .where(eq(beregamHealth.id, 1));

    const holdsLease = await perbaruiSewa(data.workerId);
    const maintenanceRan = await runMaintenanceBilaPerlu();
    const health = await ambilHealth();

    return NextResponse.json({
      ok: true,
      serverTime: new Date().toISOString(),
      botEnabled: health.botEnabled,
      holdsLease,
      maintenanceRan,
    });
  } catch (error) {
    console.error("[beregam] heartbeat gagal:", error);
    return NextResponse.json({ ok: false, message: "Gagal mencatat heartbeat." }, { status: 500 });
  }
}
