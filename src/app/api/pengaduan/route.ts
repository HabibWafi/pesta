import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pengaduans } from "@/lib/db/schema";
import * as z from "zod";

const pengaduanSchema = z.object({
  nama: z.string().min(2, "Nama pelapor/anonim harus diisi"),
  kontak: z.string().min(5, "Kontak/Email harus diisi untuk konfirmasi"),
  kategori: z.string().min(1, "Pilih kategori pengaduan"),
  detail: z.string().min(15, "Uraian pengaduan minimal 15 karakter"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = pengaduanSchema.parse(body);

    const [inserted] = await db
      .insert(pengaduans)
      .values({
        nama: validated.nama,
        email: validated.kontak,
        kategori: validated.kategori,
        detail: validated.detail,
        status: "PENDING",
      })
      .$returningId();

    const [newPengaduan] = await db
      .select()
      .from(pengaduans)
      .where(eq(pengaduans.id, inserted.id))
      .limit(1);

    return NextResponse.json(
      {
        success: true,
        message: "Pengaduan mandiri berhasil diterima oleh BPS Musi Rawas.",
        data: newPengaduan,
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

    console.error("API Pengaduan Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengirim pengaduan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
