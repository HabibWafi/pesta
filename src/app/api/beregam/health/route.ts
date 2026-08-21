import { NextResponse } from "next/server";
import { beregamSiap } from "@/lib/beregam/config";
import { runWatchdog } from "@/lib/beregam/services/maintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Kesehatan sistem - DAN pemicu watchdog.
 *
 * TANPA kunci API, karena di-ping UptimeRobot tiap 5 menit secara gratis.
 *
 * Watchdog sengaja dijalankan di sini, bukan di heartbeat worker: pemicunya
 * tidak boleh pihak yang sedang mati. Kalau worker yang memicu pemeriksaan
 * "apakah worker mati", pemeriksaan itu berhenti tepat saat paling
 * dibutuhkan.
 *
 * Responsnya sengaja ringkas - endpoint ini publik dan tidak boleh
 * membocorkan keadaan dalam sistem.
 */
export async function GET() {
  if (!beregamSiap()) {
    return NextResponse.json(
      { status: "down", serverTime: new Date().toISOString(), checks: 0 },
      { status: 503 }
    );
  }

  try {
    const hasil = await runWatchdog();
    return NextResponse.json(
      {
        status: hasil.status,
        serverTime: new Date().toISOString(),
        checks: hasil.jumlahMasalah,
      },
      { status: hasil.status === "down" ? 503 : 200 }
    );
  } catch (error) {
    console.error("[beregam] watchdog gagal:", error);
    return NextResponse.json(
      { status: "down", serverTime: new Date().toISOString(), checks: 0 },
      { status: 503 }
    );
  }
}
