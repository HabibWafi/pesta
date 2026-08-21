import { NextResponse } from "next/server";
import { otorisasiWorker } from "@/lib/beregam/auth";
import { claimAiJobBatch } from "@/lib/beregam/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * AI worker mengambil pekerjaan.
 *
 * Pola penguncian sama persis dengan outbox. Dibuat sejak Fase 1 meskipun
 * belum ada yang mengisinya: kontraknya jadi benar sejak awal, sehingga
 * Fase 2 nanti tidak perlu mengubah skema maupun API.
 */
export async function GET(req: Request) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;

  try {
    const limit = Number(new URL(req.url).searchParams.get("limit") ?? 3);
    const items = await claimAiJobBatch(limit, izin.workerId);
    return NextResponse.json({ items, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("[beregam] gagal mengambil ai-jobs:", error);
    return NextResponse.json({ ok: false, message: "Gagal mengambil pekerjaan." }, { status: 500 });
  }
}
