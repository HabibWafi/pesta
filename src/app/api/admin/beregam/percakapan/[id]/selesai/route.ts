import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { beregamContacts, beregamHandovers, beregamSessions } from "@/lib/beregam/db/schema";
import { getAdminSession } from "@/lib/auth";
import { getBeregamService } from "@/lib/beregam/services/beregam-service";

const selesaiSchema = z.object({ catatan: z.string().trim().max(1000).optional() });

/**
 * Menandai percakapan selesai ditangani dan mengembalikan bot ke mode
 * normal - kebalikan dari escalate(): melepas kunci manual, bukan
 * mengunci. Tanpa ini, kontak yang sudah dibantu petugas tidak akan pernah
 * dilayani bot lagi kecuali menunggu manualModeTimeoutMinutes (2 jam).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id: idTeks } = await ctx.params;
  const id = Number(idTeks);
  if (!id) {
    return NextResponse.json({ success: false, message: "ID tidak sah" }, { status: 400 });
  }

  try {
    const data = selesaiSchema.parse(await req.json().catch(() => ({})));

    const [kontak] = await db.select().from(beregamContacts).where(eq(beregamContacts.id, id)).limit(1);
    if (!kontak) {
      return NextResponse.json({ success: false, message: "Kontak tidak ditemukan" }, { status: 404 });
    }

    // Id handover diambil SEBELUM statusnya diubah - sesudah diubah, filter
    // "open/claimed" tidak akan menemukannya lagi, dan penilaian warga jadi
    // tidak bisa dihubungkan ke percakapan mana pun.
    const [handover] = await db
      .select({ id: beregamHandovers.id })
      .from(beregamHandovers)
      .where(
        and(
          eq(beregamHandovers.contactId, kontak.id),
          inArray(beregamHandovers.status, ["open", "claimed"])
        )
      )
      .orderBy(desc(beregamHandovers.id))
      .limit(1);

    await db
      .update(beregamHandovers)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolutionNote: data.catatan?.slice(0, 1000) ?? null,
        assignedTo: session.id,
      })
      .where(
        and(eq(beregamHandovers.contactId, kontak.id), inArray(beregamHandovers.status, ["open", "claimed"]))
      );

    await db
      .update(beregamSessions)
      .set({ mode: "bot", state: "idle" })
      .where(eq(beregamSessions.contactId, kontak.id));

    /*
     * Menanyakan penilaian layanan.
     *
     * Dibungkus try-catch sendiri: kegagalan mengirim pertanyaan kepuasan
     * TIDAK boleh menggagalkan penandaan selesai. Petugas sudah menyelesaikan
     * pekerjaannya, dan status percakapan tidak boleh bergantung pada
     * berhasil tidaknya satu pesan tambahan.
     */
    try {
      await getBeregamService().mintaPenilaian(kontak, handover?.id ?? null);
    } catch (error) {
      console.error("[beregam] gagal meminta penilaian:", error);
    }

    return NextResponse.json({ success: true, message: "Percakapan ditandai selesai" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API Beregam Selesai Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menandai selesai" }, { status: 500 });
  }
}
