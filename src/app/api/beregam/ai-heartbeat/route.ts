import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamHealth } from "@/lib/beregam/db/schema";
import { otorisasiWorker } from "@/lib/beregam/auth";
import { aiHeartbeatRequestSchema } from "@/lib/beregam/contracts";
import { ambilHealth } from "@/lib/beregam/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Denyut nadi AI worker. Terpisah dari worker pesan karena bisa mati sendiri. */
export async function POST(req: Request) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;

  try {
    const data = aiHeartbeatRequestSchema.parse(await req.json());
    const health = await ambilHealth();

    await db
      .update(beregamHealth)
      .set({
        aiWorkerLastSeenAt: new Date(),
        meta: {
          ...((health.meta as Record<string, unknown>) ?? {}),
          ai: {
            workerId: data.workerId,
            aiMode: data.aiMode ?? null,
            embedModel: data.embedModel ?? null,
            llmModel: data.llmModel ?? null,
            indexedChunks: data.indexedChunks ?? null,
            vramMb: data.vramMb ?? null,
          },
        },
      })
      .where(eq(beregamHealth.id, 1));

    return NextResponse.json({ ok: true, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("[beregam] ai-heartbeat gagal:", error);
    return NextResponse.json({ ok: false, message: "Gagal mencatat heartbeat AI." }, { status: 500 });
  }
}
