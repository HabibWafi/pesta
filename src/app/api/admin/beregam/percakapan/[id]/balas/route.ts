import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { beregamContacts } from "@/lib/beregam/db/schema";
import { getAdminSession } from "@/lib/auth";
import { getGateway } from "@/lib/beregam/drivers";
import { tahanBotUntukPetugas } from "@/lib/beregam/kendali-petugas";

const balasSchema = z.object({ pesan: z.string().trim().min(1, "Pesan tidak boleh kosong").max(4000) });

/**
 * Petugas membalas warga langsung dari admin panel.
 *
 * Pesannya tetap lewat gateway -> beregam_outbox -> worker -> WAHA, PERSIS
 * jalur yang sama dengan balasan bot. Artinya balasan ini terkirim dari
 * nomor bot (6285169881015) juga - bukan dari nomor pribadi petugas -
 * sehingga tercatat rapi di riwayat yang sama dan warga tidak menerima
 * pesan dari nomor asing.
 *
 * Sekaligus mengunci sesi ke mode manual (petugas sedang menangani) dan
 * mengklaim handover yang terbuka, supaya bot tidak ikut menjawab di atas
 * balasan petugas.
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
    const data = balasSchema.parse(await req.json());

    const [kontak] = await db.select().from(beregamContacts).where(eq(beregamContacts.id, id)).limit(1);
    if (!kontak) {
      return NextResponse.json({ success: false, message: "Kontak tidak ditemukan" }, { status: 404 });
    }

    // Tahan bot SEBELUM pesan masuk antrean. Selain menutup celah balapan
    // dengan balasan warga yang sangat cepat, helper ini juga membuat
    // handover bila petugas memulai percakapan tanpa permintaan sebelumnya.
    await tahanBotUntukPetugas(
      kontak.id,
      "Percakapan dimulai petugas melalui panel PESTA",
      session.id
    );

    await getGateway().queueText(kontak.id, kontak.waId, data.pesan, {
      source: "agent",
      sentBy: session.id,
    });

    return NextResponse.json({ success: true, message: "Balasan diantrekan" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API Beregam Balas Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengirim balasan" }, { status: 500 });
  }
}
