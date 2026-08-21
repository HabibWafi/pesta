import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import * as z from "zod";

const contactSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  subjek: z.string().min(3, "Subjek minimal 3 karakter"),
  pesan: z.string().min(10, "Pesan minimal 10 karakter"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = contactSchema.parse(body);

    const [inserted] = await db
      .insert(contacts)
      .values({
        nama: validated.nama,
        email: validated.email,
        subjek: validated.subjek,
        pesan: validated.pesan,
        status: "UNREAD",
      })
      .$returningId();

    // MySQL tidak mengembalikan baris hasil insert. Diambil ulang supaya
    // bentuk respons tetap sama seperti sebelum migrasi ke Drizzle.
    const [newMessage] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, inserted.id))
      .limit(1);

    return NextResponse.json(
      {
        success: true,
        message: "Pesan Anda berhasil terkirim ke PST BPS Musi Rawas.",
        data: newMessage,
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

    console.error("API Contact Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengirim pesan kontak. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
