import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamAiJobs } from "@/lib/beregam/db/schema";
import { otorisasiWorker } from "@/lib/beregam/auth";
import { aiJobResultRequestSchema } from "@/lib/beregam/contracts";
import { getBeregamService } from "@/lib/beregam/services/beregam-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * AI worker mengirim hasil pekerjaannya.
 *
 * Responsnya SENGAJA memuat teks final, supaya worker tidak perlu menunggu
 * siklus polling berikutnya. Meski begitu, PESTA tetap satu-satunya pihak
 * yang memutuskan apa yang dikirim - worker hanya menyampaikan.
 *
 * Pembatasan itu bukan formalitas: seluruh pagar pengaman AI (menolak angka
 * yang tidak ada di konteks, menolak jawaban terlalu panjang, mengeskalasi
 * saat konteksnya kosong) berjalan di sisi PESTA. Kalau worker boleh
 * memutuskan sendiri, pagar-pagar itu bisa dilewati begitu saja.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;

  const { id: idTeks } = await ctx.params;
  const id = Number(idTeks);
  if (!id) {
    return NextResponse.json({ ok: false, message: "Id tidak sah." }, { status: 400 });
  }

  try {
    const data = aiJobResultRequestSchema.parse(await req.json());

    const [job] = await db.select().from(beregamAiJobs).where(eq(beregamAiJobs.id, id)).limit(1);
    if (!job) {
      return NextResponse.json({ ok: false, message: "Pekerjaan tidak ditemukan." }, { status: 404 });
    }

    await db
      .update(beregamAiJobs)
      .set({
        status: data.status,
        result: data.result?.slice(0, 4000) ?? null,
        score: data.score !== undefined ? String(data.score) : null,
        contextUsed: data.contextUsed ?? null,
        model: data.model ?? null,
        latencyMs: data.latencyMs ?? null,
        error: data.error?.slice(0, 500) ?? null,
        lockedAt: null,
        lockedBy: null,
      })
      .where(eq(beregamAiJobs.id, id));

    // Fase 1 belum memakai AI, jadi selalu null. Diisi pada Fase 2.
    const replyText = await getBeregamService().handleAiResult();

    return NextResponse.json({ ok: true, replyText });
  } catch (error) {
    console.error("[beregam] gagal memproses hasil AI:", error);
    return NextResponse.json({ ok: false, message: "Gagal memproses hasil." }, { status: 500 });
  }
}
