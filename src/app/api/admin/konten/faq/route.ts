import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { faqs } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth";
import { segarkanKonten } from "@/lib/content";
import * as z from "zod";

const faqSchema = z.object({
  pertanyaan: z.string().trim().min(5, "Pertanyaan minimal 5 karakter").max(255),
  jawaban: z.string().trim().min(10, "Jawaban minimal 10 karakter"),
  kategori: z.string().trim().max(60).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = faqSchema.parse(await req.json());

    const [inserted] = await db
      .insert(faqs)
      .values({
        pertanyaan: data.pertanyaan,
        jawaban: data.jawaban,
        kategori: data.kategori || null,
        sortOrder: data.sortOrder,
        isPublished: data.isPublished,
      })
      .$returningId();

    segarkanKonten();
    return NextResponse.json(
      { success: true, message: "FAQ ditambahkan", id: inserted.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API FAQ POST Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menambah FAQ" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib diisi" }, { status: 400 });
    }

    const data = faqSchema.parse(body);

    const [result] = await db
      .update(faqs)
      .set({
        pertanyaan: data.pertanyaan,
        jawaban: data.jawaban,
        kategori: data.kategori || null,
        sortOrder: data.sortOrder,
        isPublished: data.isPublished,
      })
      .where(eq(faqs.id, id));

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: "FAQ tidak ditemukan" }, { status: 404 });
    }

    segarkanKonten();
    return NextResponse.json({ success: true, message: "FAQ diperbarui" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API FAQ PUT Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui FAQ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib diisi" }, { status: 400 });
    }

    const [result] = await db.delete(faqs).where(eq(faqs.id, id));
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: "FAQ tidak ditemukan" }, { status: 404 });
    }

    segarkanKonten();
    return NextResponse.json({ success: true, message: "FAQ dihapus" });
  } catch (error) {
    console.error("API FAQ DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus FAQ" }, { status: 500 });
  }
}
