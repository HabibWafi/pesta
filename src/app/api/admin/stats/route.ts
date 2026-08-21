import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, pengaduans, vidconRequests } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth";

/**
 * Mengambil angka dari query hitung.
 *
 * Prisma punya .count() yang langsung mengembalikan number; di Drizzle
 * hasilnya berupa satu baris berisi kolom agregat, jadi dibungkus di sini
 * supaya pemanggilnya tetap terbaca ringkas.
 */
async function hitung(query: PromiseLike<{ n: number }[]>): Promise<number> {
  const [row] = await query;
  return row?.n ?? 0;
}

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
      hitung(db.select({ n: count() }).from(vidconRequests)),
      hitung(db.select({ n: count() }).from(vidconRequests).where(eq(vidconRequests.status, "PENDING"))),
      hitung(db.select({ n: count() }).from(pengaduans)),
      hitung(db.select({ n: count() }).from(pengaduans).where(eq(pengaduans.status, "PENDING"))),
      hitung(db.select({ n: count() }).from(contacts)),
      hitung(db.select({ n: count() }).from(contacts).where(eq(contacts.status, "UNREAD"))),
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
