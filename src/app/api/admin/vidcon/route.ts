import { NextResponse } from "next/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { vidconRequests } from "@/lib/db/schema";
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
      conditions.push(eq(vidconRequests.status, status));
    }
    const search = containsAny(query, [
      vidconRequests.nama,
      vidconRequests.asalInstansi,
      vidconRequests.email,
      vidconRequests.cakupan,
    ]);
    if (search) conditions.push(search);

    const items = await db
      .select()
      .from(vidconRequests)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(vidconRequests.createdAt));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("API Admin ViDCon GET Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat data ViDCon" }, { status: 500 });
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
      .update(vidconRequests)
      .set({ status, catatanAdmin })
      .where(eq(vidconRequests.id, Number(id)));

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Permohonan ViDCon tidak ditemukan" },
        { status: 404 }
      );
    }

    // Diambil ulang karena MySQL tidak mengembalikan baris hasil update.
    const [updated] = await db
      .select()
      .from(vidconRequests)
      .where(eq(vidconRequests.id, Number(id)))
      .limit(1);

    return NextResponse.json({ success: true, message: "Status ViDCon berhasil diperbarui", data: updated });
  } catch (error) {
    console.error("API Admin ViDCon PUT Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui status ViDCon" }, { status: 500 });
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
      .delete(vidconRequests)
      .where(eq(vidconRequests.id, Number(id)));

    // Prisma dulu melempar error bila baris tidak ada. Tanpa pemeriksaan ini,
    // menghapus id yang tidak ada akan dilaporkan "berhasil" - padahal tidak
    // ada yang terhapus.
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Permohonan ViDCon tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Permohonan ViDCon berhasil dihapus" });
  } catch (error) {
    console.error("API Admin ViDCon DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus permohonan ViDCon" }, { status: 500 });
  }
}
