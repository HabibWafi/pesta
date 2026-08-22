import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamContacts, beregamHandovers, beregamMessages, beregamSessions } from "@/lib/beregam/db/schema";
import { getAdminSession } from "@/lib/auth";

/** Satu percakapan lengkap: kontak, sesi, seluruh pesan, dan riwayat handover. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    const [kontak] = await db.select().from(beregamContacts).where(eq(beregamContacts.id, id)).limit(1);
    if (!kontak) {
      return NextResponse.json({ success: false, message: "Kontak tidak ditemukan" }, { status: 404 });
    }

    const [sesi] = await db.select().from(beregamSessions).where(eq(beregamSessions.contactId, id)).limit(1);

    // Terbaru 200 pesan cukup untuk keperluan petugas - jarang ada
    // percakapan lebih panjang dari itu, dan membatasinya menjaga halaman
    // tetap ringan tanpa perlu pagination.
    const pesanTerbalik = await db
      .select()
      .from(beregamMessages)
      .where(eq(beregamMessages.contactId, id))
      .orderBy(desc(beregamMessages.id))
      .limit(200);
    const pesan = pesanTerbalik.reverse();

    const handovers = await db
      .select()
      .from(beregamHandovers)
      .where(eq(beregamHandovers.contactId, id))
      .orderBy(desc(beregamHandovers.id))
      .limit(10);

    return NextResponse.json({ success: true, kontak, sesi: sesi ?? null, pesan, handovers });
  } catch (error) {
    console.error("API Beregam Percakapan Detail GET Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat percakapan" }, { status: 500 });
  }
}
