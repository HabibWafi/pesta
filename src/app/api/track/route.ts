import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import {
  bacaIp,
  kenaliBrowser,
  kenaliPerangkat,
  pemeliharaanAnalitik,
  sidikPengunjung,
  tampaknyaBot,
} from "@/lib/analytics";
import * as z from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const trackSchema = z.object({
  path: z.string().trim().min(1).max(190),
  referrer: z.string().trim().max(190).optional().or(z.literal("")),
});

/**
 * Perekam kunjungan.
 *
 * Dipanggil dari komponen kecil di layout SETELAH halaman ter-render, bukan
 * dari middleware. Dua alasannya:
 *
 * 1. Tidak menambah latensi pada permintaan halaman itu sendiri.
 * 2. Perayap yang tidak menjalankan JavaScript tersaring dengan sendirinya.
 *
 * Selalu membalas 204, bahkan saat gagal. Kegagalan mencatat statistik
 * bukan alasan untuk menampilkan error kepada pengunjung.
 */
export async function POST(req: Request) {
  try {
    const userAgent = req.headers.get("user-agent") ?? "";
    if (!userAgent || tampaknyaBot(userAgent)) {
      return new NextResponse(null, { status: 204 });
    }

    const { path, referrer } = trackSchema.parse(await req.json());

    // IP hanya dipakai untuk membentuk sidik, lalu dibuang. Tidak pernah
    // disimpan ke kolom mana pun dan tidak pernah ditulis ke log.
    const visitorHash = sidikPengunjung(bacaIp(req.headers), userAgent);

    await db.insert(analyticsEvents).values({
      path,
      referrer: referrer || null,
      visitorHash,
      device: kenaliPerangkat(userAgent),
      browser: kenaliBrowser(userAgent),
    });

    // Rollup harian dan pembersihan retensi, bergerbang waktu. Menggantikan
    // cron sepenuhnya - pola yang sama dengan heartbeat Beregam nanti.
    void pemeliharaanAnalitik();

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
