import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

/**
 * Daftar percakapan Beregam untuk inbox admin.
 *
 * Satu query gabungan dengan subquery terkorelasi, BUKAN window function
 * (ROW_NUMBER() OVER ...). Versi MySQL di Hostinger belum terverifikasi -
 * kalau ternyata MariaDB lama, window function bisa saja tidak tersedia.
 * Subquery terkorelasi jalan di MySQL 5.7 ke atas maupun seluruh MariaDB.
 */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const cari = new URL(req.url).searchParams.get("cari")?.trim() || "";
    const filterNomor = cari ? sql`AND (c.phone LIKE ${`%${cari}%`} OR c.name LIKE ${`%${cari}%`})` : sql``;

    const hasil = await db.execute(sql`
      SELECT
        c.id, c.wa_id, c.phone, c.name, c.is_blocked, c.opted_out_at,
        c.message_count, c.first_seen_at, c.last_seen_at,
        s.mode, s.state,
        (SELECT body FROM beregam_messages m WHERE m.contact_id = c.id ORDER BY m.id DESC LIMIT 1) AS pesan_terakhir,
        (SELECT direction FROM beregam_messages m WHERE m.contact_id = c.id ORDER BY m.id DESC LIMIT 1) AS arah_terakhir,
        (SELECT created_at FROM beregam_messages m WHERE m.contact_id = c.id ORDER BY m.id DESC LIMIT 1) AS waktu_pesan_terakhir,
        h.id AS handover_id, h.status AS handover_status, h.reason AS handover_reason,
        h.assigned_to AS handover_assigned_to, h.created_at AS handover_dibuka
      FROM beregam_contacts c
      LEFT JOIN beregam_sessions s ON s.contact_id = c.id
      LEFT JOIN beregam_handovers h ON h.contact_id = c.id AND h.status IN ('open', 'claimed')
      WHERE 1=1 ${filterNomor}
      ORDER BY c.last_seen_at DESC
      LIMIT 200
    `);

    const baris = (hasil as unknown as [Record<string, unknown>[], unknown])[0] ?? [];

    return NextResponse.json({ success: true, percakapan: baris });
  } catch (error) {
    console.error("API Beregam Percakapan GET Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat daftar percakapan" }, { status: 500 });
  }
}
