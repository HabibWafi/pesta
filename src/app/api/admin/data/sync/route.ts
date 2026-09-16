import { NextResponse } from "next/server";
import { getAdminSession, isSuperadmin } from "@/lib/auth";
import { sinkronisasiDataset } from "@/lib/dashboard-data/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Belum masuk." }, { status: 401 });
  if (!isSuperadmin(session)) {
    return NextResponse.json(
      { success: false, message: "Hanya SUPERADMIN yang boleh menjalankan sinkronisasi." },
      { status: 403 }
    );
  }
  try {
    const result = await sinkronisasiDataset("admin", session.id);
    const success = result.errors.length === 0;
    return NextResponse.json({
      success,
      message: success
        ? `Pemeriksaan selesai. ${result.drafts} draf baru dibuat.`
        : `Pemeriksaan selesai dengan ${result.errors.length} kendala.`,
      ...result,
    }, { status: success ? 200 : 502 });
  } catch (error) {
    console.error("[admin-data] sinkronisasi gagal:", error);
    return NextResponse.json({ success: false, message: "Sinkronisasi gagal dijalankan." }, { status: 500 });
  }
}
