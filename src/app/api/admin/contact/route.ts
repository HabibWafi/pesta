import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const where: any = {};

    // Map frontend isRead filter to database status field
    if (isReadParam === "true") {
      where.status = { in: ["READ", "REPLIED"] };
    } else if (isReadParam === "false") {
      where.status = "UNREAD";
    }

    if (query) {
      where.OR = [
        { nama: { contains: query } },
        { email: { contains: query } },
        { subjek: { contains: query } },
        { pesan: { contains: query } },
      ];
    }

    const items = await prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Map database status field to frontend isRead boolean for compatibility
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

    // Support both isRead boolean (from mark as read button) and status string (direct status update)
    let newStatus: string;
    if (status) {
      newStatus = status;
    } else if (isRead !== undefined) {
      newStatus = isRead ? "READ" : "UNREAD";
    } else {
      return NextResponse.json({ success: false, message: "Status atau isRead wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.contactMessage.update({
      where: { id: Number(id) },
      data: { status: newStatus },
    });

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

    await prisma.contactMessage.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: "Pesan kontak berhasil dihapus" });
  } catch (error) {
    console.error("API Admin Contact DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus pesan kontak" }, { status: 500 });
  }
}
