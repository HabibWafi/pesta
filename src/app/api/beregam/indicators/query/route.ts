import { NextResponse } from "next/server";
import { otorisasiWorker } from "@/lib/beregam/auth";
import { indicatorQuerySchema } from "@/lib/beregam/contracts";
import { resolveIndicatorQuery } from "@/lib/dashboard-data/sinta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;
  try {
    const query = indicatorQuerySchema.parse(await req.json());
    const resolved = await resolveIndicatorQuery(query);
    return NextResponse.json({ ok: true, query, ...resolved });
  } catch (error) {
    console.error("[beregam] query indikator ditolak:", error);
    return NextResponse.json({ ok: false, message: "Permintaan indikator tidak sah." }, { status: 400 });
  }
}
