import { NextResponse } from "next/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { pengaduans } from "@/lib/db/schema";
import { containsAny } from "@/lib/db/filters";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    const conditions: SQL[] = [];
    if (status && status !== "ALL") {
      conditions.push(eq(pengaduans.status, status));
    }
    const search = containsAny(query, [
      pengaduans.nama,
      pengaduans.email,
      pengaduans.kategori,
      pengaduans.detail,
    ]);
    if (search) conditions.push(search);

    const items = await db
      .select()
      .from(pengaduans)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(pengaduans.createdAt));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("API Admin Pengaduan GET Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat data pengaduan" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, tanggapan } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, message: "ID dan Status wajib diisi" }, { status: 400 });
    }

    const [result] = await db
      .update(pengaduans)
      .set({ status, tanggapan })
      .where(eq(pengaduans.id, Number(id)));

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Pengaduan tidak ditemukan" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .select()
      .from(pengaduans)
      .where(eq(pengaduans.id, Number(id)))
      .limit(1);

    return NextResponse.json({ success: true, message: "Pengaduan & tanggapan berhasil diperbarui", data: updated });
  } catch (error) {
    console.error("API Admin Pengaduan PUT Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui pengaduan" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib diisi" }, { status: 400 });
    }

    const [result] = await db.delete(pengaduans).where(eq(pengaduans.id, Number(id)));

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Pengaduan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Pengaduan berhasil dihapus" });
  } catch (error) {
    console.error("API Admin Pengaduan DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus pengaduan" }, { status: 500 });
  }
}
