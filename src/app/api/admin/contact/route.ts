import { NextResponse } from "next/server";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { containsAny } from "@/lib/db/filters";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const isReadParam = searchParams.get("isRead");
    const query = searchParams.get("q");

    const conditions: SQL[] = [];

    // Filter isRead dari frontend dipetakan ke kolom status di database.
    if (isReadParam === "true") {
      conditions.push(inArray(contacts.status, ["READ", "REPLIED"]));
    } else if (isReadParam === "false") {
      conditions.push(eq(contacts.status, "UNREAD"));
    }

    const search = containsAny(query, [
      contacts.nama,
      contacts.email,
      contacts.subjek,
      contacts.pesan,
    ]);
    if (search) conditions.push(search);

    const items = await db
      .select()
      .from(contacts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(contacts.createdAt));

    // Kolom status dipetakan balik jadi boolean isRead agar frontend tetap sama.
    const mappedItems = items.map((item) => ({
      ...item,
      isRead: item.status !== "UNREAD",
    }));

    return NextResponse.json({ success: true, items: mappedItems });
  } catch (error) {
    console.error("API Admin Contact GET Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat pesan kontak" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, isRead, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib diisi" }, { status: 400 });
    }

    // Mendukung dua bentuk: boolean isRead (tombol "tandai dibaca") dan
    // status string (perubahan status langsung).
    let newStatus: string;
    if (status) {
      newStatus = status;
    } else if (isRead !== undefined) {
      newStatus = isRead ? "READ" : "UNREAD";
    } else {
      return NextResponse.json({ success: false, message: "Status atau isRead wajib diisi" }, { status: 400 });
    }

    const [result] = await db
      .update(contacts)
      .set({ status: newStatus })
      .where(eq(contacts.id, Number(id)));

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Pesan kontak tidak ditemukan" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, Number(id)))
      .limit(1);

    return NextResponse.json({ success: true, message: "Status pesan berhasil diperbarui", data: updated });
  } catch (error) {
    console.error("API Admin Contact PUT Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui status pesan" }, { status: 500 });
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

    const [result] = await db.delete(contacts).where(eq(contacts.id, Number(id)));

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Pesan kontak tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Pesan kontak berhasil dihapus" });
  } catch (error) {
    console.error("API Admin Contact DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus pesan kontak" }, { status: 500 });
  }
}
