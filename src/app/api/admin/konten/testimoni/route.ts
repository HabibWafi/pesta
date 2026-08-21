import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { testimonials } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth";
import { segarkanKonten } from "@/lib/content";
import * as z from "zod";

const testimoniSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
  peran: z.string().trim().max(150).optional().or(z.literal("")),
  instansi: z.string().trim().max(150).optional().or(z.literal("")),
  pesan: z.string().trim().min(10, "Isi testimoni minimal 10 karakter"),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  sortOrder: z.coerce.number().int().default(0),
  isPublished: z.boolean().default(false),
  sourceNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = testimoniSchema.parse(await req.json());

    // Testimoni tanpa catatan sumber tidak boleh langsung tayang. Ini situs
    // resmi instansi; pujian yang mengatasnamakan orang dan lembaga tertentu
    // harus bisa ditelusuri keasliannya.
    if (data.isPublished && !data.sourceNote) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Isi dulu catatan sumber (dari mana testimoni ini berasal) sebelum menayangkannya.",
        },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(testimonials)
      .values({
        nama: data.nama,
        peran: data.peran || null,
        instansi: data.instansi || null,
        pesan: data.pesan,
        rating: data.rating,
        sortOrder: data.sortOrder,
        isPublished: data.isPublished,
        sourceNote: data.sourceNote || null,
      })
      .$returningId();

    segarkanKonten();
    return NextResponse.json(
      { success: true, message: "Testimoni ditambahkan", id: inserted.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API Testimoni POST Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menambah testimoni" }, { status: 500 });
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

    const data = testimoniSchema.parse(body);

    if (data.isPublished && !data.sourceNote) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Isi dulu catatan sumber (dari mana testimoni ini berasal) sebelum menayangkannya.",
        },
        { status: 400 }
      );
    }

    const [result] = await db
      .update(testimonials)
      .set({
        nama: data.nama,
        peran: data.peran || null,
        instansi: data.instansi || null,
        pesan: data.pesan,
        rating: data.rating,
        sortOrder: data.sortOrder,
        isPublished: data.isPublished,
        sourceNote: data.sourceNote || null,
      })
      .where(eq(testimonials.id, id));

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Testimoni tidak ditemukan" },
        { status: 404 }
      );
    }

    segarkanKonten();
    return NextResponse.json({ success: true, message: "Testimoni diperbarui" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API Testimoni PUT Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui testimoni" }, { status: 500 });
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

    const [result] = await db.delete(testimonials).where(eq(testimonials.id, id));
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Testimoni tidak ditemukan" },
        { status: 404 }
      );
    }

    segarkanKonten();
    return NextResponse.json({ success: true, message: "Testimoni dihapus" });
  } catch (error) {
    console.error("API Testimoni DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus testimoni" }, { status: 500 });
  }
}
