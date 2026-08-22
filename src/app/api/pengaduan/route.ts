import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pengaduans } from "@/lib/db/schema";
import { aduanSchema } from "@/lib/schemas/aduan";
import { beritahuPermohonanBaru } from "@/lib/beregam/notifikasi";
import * as z from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = aduanSchema.parse(body);

    const [inserted] = await db
      .insert(pengaduans)
      .values({
        nama: data.nama,
        email: data.email,
        noHp: data.noHp || null,
        jenisKelamin: data.jenisKelamin || null,
        asalInstansi: data.asalInstansi || null,
        kategori: data.kategori,
        detail: data.detail,
        status: "PENDING",
      })
      .$returningId();

    const [newAduan] = await db
      .select()
      .from(pengaduans)
      .where(eq(pengaduans.id, inserted.id))
      .limit(1);

    await beritahuPermohonanBaru({
      jenis: "pengaduan",
      id: inserted.id,
      nama: data.nama,
      sumber: "WEB",
      kontak: data.noHp || data.email,
      baris: [`Kategori: ${data.kategori}`],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Aduan berhasil diterima oleh BPS Musi Rawas.",
        data: newAduan,
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

    console.error("API Aduan Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengirim aduan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
