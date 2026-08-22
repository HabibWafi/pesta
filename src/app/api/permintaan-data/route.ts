import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { permintaanData } from "@/lib/db/schema";
import { permintaanDataSchema } from "@/lib/schemas/permintaan-data";
import * as z from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = permintaanDataSchema.parse(body);

    const [inserted] = await db
      .insert(permintaanData)
      .values({
        nama: data.nama,
        asalInstansi: data.instansi,
        alamat: data.alamat,
        noHp: data.noHp,
        email: data.email,
        jenisData: data.jenisData,
        keperluan: data.keperluan,
        formatDiinginkan: data.formatDiinginkan,
        catatan: data.catatan || null,
        status: "PENDING",
        sumber: "WEB",
      })
      .$returningId();

    const [newRequest] = await db
      .select()
      .from(permintaanData)
      .where(eq(permintaanData.id, inserted.id))
      .limit(1);

    return NextResponse.json(
      {
        success: true,
        message: "Permintaan data berhasil didaftarkan ke sistem BPS Musi Rawas.",
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

    console.error("API Permintaan Data Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses permintaan data. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
