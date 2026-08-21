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
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (query) {
      where.OR = [
        { nama: { contains: query } },
        { email: { contains: query } },
        { kategori: { contains: query } },
        { detail: { contains: query } },
      ];
    }

    const items = await prisma.pengaduan.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

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

    const updated = await prisma.pengaduan.update({
      where: { id: Number(id) },
      data: {
        status,
        tanggapan,
      },
    });

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

    await prisma.pengaduan.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: "Pengaduan berhasil dihapus" });
  } catch (error) {
    console.error("API Admin Pengaduan DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus pengaduan" }, { status: 500 });
  }
}
