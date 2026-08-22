import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { permintaanData } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth";

/** Mengunduh lampiran permintaan data. Isinya di database, bukan filesystem - lihat catatan di schema.ts. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    const [baris] = await db
      .select({
        nama: permintaanData.lampiranNama,
        tipe: permintaanData.lampiranTipe,
        data: permintaanData.lampiranData,
      })
      .from(permintaanData)
      .where(eq(permintaanData.id, id))
      .limit(1);

    if (!baris || !baris.data || !baris.nama) {
      return NextResponse.json({ success: false, message: "Lampiran tidak ditemukan" }, { status: 404 });
    }

    // Buffer Node adalah Uint8Array - diterima langsung sebagai BodyInit.
    return new Response(new Uint8Array(baris.data), {
      headers: {
        "Content-Type": baris.tipe || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(baris.nama)}"`,
        "Content-Length": String(baris.data.byteLength),
      },
    });
  } catch (error) {
    console.error("API Admin Lampiran Permintaan Data Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengunduh lampiran" }, { status: 500 });
  }
}
