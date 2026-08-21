import { NextResponse } from "next/server";
import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamKb } from "@/lib/beregam/db/schema";
import { otorisasiWorker } from "@/lib/beregam/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * AI worker menarik entri basis pengetahuan yang berubah.
 *
 * Mengembalikan entri aktif yang diperbarui setelah `since`, ATAU yang
 * belum pernah di-indeks sama sekali. Kondisi kedua itu penting: entri baru
 * yang dibuat petugas harus ikut terambil walau tanggalnya lebih lama dari
 * sinkronisasi terakhir.
 */
export async function GET(req: Request) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;

  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

    const kondisi = since
      ? and(
          eq(beregamKb.isActive, true),
          or(gt(beregamKb.updatedAt, new Date(since)), isNull(beregamKb.indexedAt))
        )
      : eq(beregamKb.isActive, true);

    const items = await db
      .select({
        id: beregamKb.id,
        title: beregamKb.title,
        content: beregamKb.content,
        category: beregamKb.category,
        sourceRef: beregamKb.sourceRef,
        contentHash: beregamKb.contentHash,
      })
      .from(beregamKb)
      .where(kondisi)
      .orderBy(asc(beregamKb.id))
      .limit(limit);

    return NextResponse.json({ items, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("[beregam] gagal mengambil KB:", error);
    return NextResponse.json({ ok: false, message: "Gagal mengambil basis pengetahuan." }, { status: 500 });
  }
}
