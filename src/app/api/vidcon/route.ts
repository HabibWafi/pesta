import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vidconRequests } from "@/lib/db/schema";
import { vidconSchema } from "@/lib/schemas/vidcon";
import { beritahuPermohonanBaru } from "@/lib/beregam/notifikasi";
import * as z from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = vidconSchema.parse(body);

    const [inserted] = await db
      .insert(vidconRequests)
      .values({
        nama: data.nama,
        asalInstansi: data.instansi,
        alamat: data.alamat,
        noHp: data.noHp,
        email: data.email,
        cakupan: data.topik,
        deskripsi: data.deskripsi,
        tanggal: data.tanggal,
        jam: data.jam,
        status: "PENDING",
        layananInklusif: data.layananInklusif ?? null,
        layananInklusifCatatan: data.layananInklusifCatatan || null,
      })
      .$returningId();

    const [newRequest] = await db
      .select()
      .from(vidconRequests)
      .where(eq(vidconRequests.id, inserted.id))
      .limit(1);

    // Beri tahu petugas piket lewat WhatsApp. Tidak pernah melempar galat -
    // permohonan warga sudah tersimpan, dan gagal mengirim pemberitahuan
    // tidak boleh membuatnya terlihat gagal.
    await beritahuPermohonanBaru({
      jenis: "vidcon",
      id: inserted.id,
      nama: data.nama,
      sumber: "WEB",
      kontak: data.noHp,
      baris: [
        `Instansi: ${data.instansi}`,
        `Topik: ${data.topik}`,
        `Jadwal diminta: ${data.tanggal} pukul ${data.jam} WIB`,
        data.layananInklusifCatatan ? `Perlu pendampingan: ${data.layananInklusifCatatan}` : "",
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Permohonan ViDCon berhasil didaftarkan ke sistem BPS Musi Rawas.",
        data: newRequest,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }

    console.error("API ViDCon Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses permohonan ViDCon. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
