import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamKb } from "@/lib/beregam/db/schema";
import { otorisasiWorker } from "@/lib/beregam/auth";
import { kbIndexedRequestSchema } from "@/lib/beregam/contracts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** AI worker menandai entri yang sudah selesai di-indeks. */
export async function POST(req: Request) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;

  try {
    const { ids } = kbIndexedRequestSchema.parse(await req.json());

    const [hasil] = await db
      .update(beregamKb)
      .set({ indexedAt: new Date() })
      .where(inArray(beregamKb.id, ids));

    return NextResponse.json({ ok: true, ditandai: hasil.affectedRows });
  } catch (error) {
    console.error("[beregam] gagal menandai KB:", error);
    return NextResponse.json({ ok: false, message: "Gagal menandai entri." }, { status: 500 });
  }
}
