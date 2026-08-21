import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vidconRequests } from "@/lib/db/schema";
import * as z from "zod";

const vidconSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  instansi: z.string().min(2, "Asal instansi minimal 2 karakter"),
  alamat: z.string().min(3, "Alamat minimal 3 karakter"),
  noHp: z.string().min(6, "Nomor HP/WA tidak valid"),
  email: z.string().email("Format email tidak valid"),
  topik: z.string().min(2, "Pilih cakupan/topik konsultasi"),
  deskripsi: z.string().min(10, "Uraian deskripsi minimal 10 karakter"),
  tanggal: z.string().min(8, "Pilih tanggal konsultasi"),
  jam: z.string().min(4, "Pilih jam konsultasi"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = vidconSchema.parse(body);

    const [inserted] = await db
      .insert(vidconRequests)
      .values({
        nama: validatedData.nama,
        asalInstansi: validatedData.instansi,
        alamat: validatedData.alamat,
        noHp: validatedData.noHp,
        email: validatedData.email,
        cakupan: validatedData.topik,
        deskripsi: validatedData.deskripsi,
        tanggal: validatedData.tanggal,
        jam: validatedData.jam,
        status: "PENDING",
      })
      .$returningId();

    const [newRequest] = await db
      .select()
      .from(vidconRequests)
      .where(eq(vidconRequests.id, inserted.id))
      .limit(1);

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
