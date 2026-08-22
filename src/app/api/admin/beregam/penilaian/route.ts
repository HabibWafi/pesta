import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

/**
 * Ringkasan penilaian layanan Beregam.
 *
 * Angka dan daftarnya diambil dalam dua query, bukan satu per baris - halaman
 * admin memuatnya sekaligus, dan Hostinger membatasi Entry Process.
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [ringkasanBaris] = (await db.execute(sql`
      SELECT
        COUNT(*)                                              AS jumlah,
        ROUND(AVG(skor), 2)                                   AS rata,
        SUM(CASE WHEN skor = 5 THEN 1 ELSE 0 END)             AS b5,
        SUM(CASE WHEN skor = 4 THEN 1 ELSE 0 END)             AS b4,
        SUM(CASE WHEN skor = 3 THEN 1 ELSE 0 END)             AS b3,
        SUM(CASE WHEN skor = 2 THEN 1 ELSE 0 END)             AS b2,
        SUM(CASE WHEN skor = 1 THEN 1 ELSE 0 END)             AS b1,
        SUM(CASE WHEN komentar IS NOT NULL AND komentar <> '' THEN 1 ELSE 0 END) AS berkomentar,
        SUM(CASE WHEN created_at >= (UTC_TIMESTAMP() - INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS bulanIni
      FROM beregam_penilaian
    `)) as unknown as [Record<string, unknown>[], unknown];

    const [daftarBaris] = (await db.execute(sql`
      SELECT
        p.id, p.skor, p.komentar, p.created_at,
        c.phone, c.name,
        u.name AS petugas
      FROM beregam_penilaian p
      LEFT JOIN beregam_contacts c ON c.id = p.contact_id
      LEFT JOIN users u ON u.id = p.ditangani_oleh
      ORDER BY p.id DESC
      LIMIT 100
    `)) as unknown as [Record<string, unknown>[], unknown];

    const r = (ringkasanBaris?.[0] ?? {}) as Record<string, unknown>;
    const angka = (v: unknown) => Number(v ?? 0);

    return NextResponse.json({
      success: true,
      ringkasan: {
        jumlah: angka(r.jumlah),
        rata: r.rata === null || r.rata === undefined ? null : Number(r.rata),
        sebaran: { 5: angka(r.b5), 4: angka(r.b4), 3: angka(r.b3), 2: angka(r.b2), 1: angka(r.b1) },
        berkomentar: angka(r.berkomentar),
        bulanIni: angka(r.bulanIni),
      },
      daftar: daftarBaris ?? [],
    });
  } catch (error) {
    console.error("API Beregam Penilaian GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat penilaian" },
      { status: 500 }
    );
  }
}
