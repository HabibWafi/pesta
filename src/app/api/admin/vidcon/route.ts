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
        { asalInstansi: { contains: query } },
        { email: { contains: query } },
        { cakupan: { contains: query } },
      ];
    }

    const items = await prisma.vidconRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

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

    const updated = await prisma.vidconRequest.update({
      where: { id: Number(id) },
      data: {
        status,
        catatanAdmin,
      },
    });

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

    await prisma.vidconRequest.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: "Permohonan ViDCon berhasil dihapus" });
  } catch (error) {
    console.error("API Admin ViDCon DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus permohonan ViDCon" }, { status: 500 });
  }
}
