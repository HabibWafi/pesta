import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, pengaduans, vidconRequests } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Hitungan hal yang belum ditangani, untuk lonceng di header admin.
 *
 * Ini lapis pertama notifikasi: cukup dengan polling ringan, tanpa
 * dependency baru. Lapis kedua (email lewat SMTP Hostinger) dan ketiga
 * (WhatsApp lewat beregam_outbox setelah bot live) menyusul.
 *
 * Sengaja hanya mengembalikan angka, bukan isi datanya. Lonceng tidak perlu
 * tahu isi aduan siapa pun.
 */
async function hitung(query: PromiseLike<{ n: number }[]>): Promise<number> {
  const [row] = await query;
  return Number(row?.n ?? 0);
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [vidconBaru, aduanBaru, kontakBelumDibaca] = await Promise.all([
      hitung(
        db
          .select({ n: count() })
          .from(vidconRequests)
          .where(eq(vidconRequests.status, "PENDING"))
      ),
      hitung(
        db.select({ n: count() }).from(pengaduans).where(eq(pengaduans.status, "PENDING"))
      ),
      hitung(db.select({ n: count() }).from(contacts).where(eq(contacts.status, "UNREAD"))),
    ]);

    return NextResponse.json({
      success: true,
      total: vidconBaru + aduanBaru + kontakBelumDibaca,
      rincian: [
        { label: "Permohonan ViDCon menunggu", jumlah: vidconBaru, href: "/admin/vidcon" },
        { label: "Aduan belum ditindaklanjuti", jumlah: aduanBaru, href: "/admin/pengaduan" },
        { label: "Pesan kontak belum dibaca", jumlah: kontakBelumDibaca, href: "/admin/contact" },
      ],
    });
  } catch (error) {
    console.error("API Admin Notifikasi Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat notifikasi" },
      { status: 500 }
    );
  }
}
