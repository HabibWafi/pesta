import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [
      totalVidcon,
      pendingVidcon,
      totalPengaduan,
      pendingPengaduan,
      totalContact,
      unreadContact,
    ] = await Promise.all([
      prisma.vidconRequest.count(),
      prisma.vidconRequest.count({ where: { status: "PENDING" } }),
      prisma.pengaduan.count(),
      prisma.pengaduan.count({ where: { status: "PENDING" } }),
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { status: "UNREAD" } }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalVidcon,
        pendingVidcon,
        totalPengaduan,
        pendingPengaduan,
        totalContact,
        unreadContact,
      },
    });
  } catch (error) {
    console.error("API Admin Stats Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil statistik dashboard" }, { status: 500 });
  }
}
