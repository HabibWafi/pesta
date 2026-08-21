import { NextResponse } from "next/server";
import { otorisasiWorker } from "@/lib/beregam/auth";
import { ringkasanStatus } from "@/lib/beregam/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ringkasan keadaan Beregam untuk panel kendali di PC kantor.
 *
 * WAJIB kunci API - berbeda dari `/health` yang sengaja publik untuk
 * UptimeRobot. Isi di sini adalah keadaan dalam sistem: berapa pesan
 * menunggu, berapa yang gagal, sesi mana yang sedang dipegang petugas.
 * Semua itu tidak boleh terbaca siapa pun yang sekadar membuka URL.
 *
 * Panel memanggil ini berulang kali, jadi seluruh hitungan diambil dalam
 * satu query gabungan - Hostinger membatasi Entry Process, dan sepuluh query
 * kecil tiap beberapa detik adalah cara pasti menabraknya.
 */
export async function GET(req: Request) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;

  try {
    const ringkasan = await ringkasanStatus();
    return NextResponse.json({ ...ringkasan, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("[beregam] gagal menyusun ringkasan status:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal membaca keadaan sistem." },
      { status: 500 }
    );
  }
}
