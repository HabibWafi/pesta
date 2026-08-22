import { NextResponse } from "next/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { permintaanData } from "@/lib/db/schema";
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
      conditions.push(eq(permintaanData.status, status));
    }
    const search = containsAny(query, [
      permintaanData.nama,
      permintaanData.asalInstansi,
      permintaanData.email,
      permintaanData.jenisData,
    ]);
    if (search) conditions.push(search);

    const items = await db
      .select()
      .from(permintaanData)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(permintaanData.createdAt));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("API Admin Permintaan Data GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data permintaan data" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, catatanAdmin } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, message: "ID dan Status wajib diisi" }, { status: 400 });
    }

    const [result] = await db
      .update(permintaanData)
      .set({ status, catatanAdmin })
      .where(eq(permintaanData.id, Number(id)));

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Permintaan data tidak ditemukan" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .select()
      .from(permintaanData)
      .where(eq(permintaanData.id, Number(id)))
      .limit(1);

    return NextResponse.json({ success: true, message: "Status permintaan data berhasil diperbarui", data: updated });
  } catch (error) {
    console.error("API Admin Permintaan Data PUT Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui status" }, { status: 500 });
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

    const [result] = await db
      .delete(permintaanData)
      .where(eq(permintaanData.id, Number(id)));

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Permintaan data tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Permintaan data berhasil dihapus" });
  } catch (error) {
    console.error("API Admin Permintaan Data DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus permintaan data" }, { status: 500 });
  }
}
