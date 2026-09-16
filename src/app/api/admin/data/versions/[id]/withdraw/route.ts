import { NextResponse } from "next/server";
import { getAdminSession, isSuperadmin } from "@/lib/auth";
import { withdrawVersion } from "@/lib/dashboard-data/sync";
import { datasetReviewSchema } from "@/lib/schemas/dashboard-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Belum masuk." }, { status: 401 });
  if (!isSuperadmin(session)) {
    return NextResponse.json(
      { success: false, message: "Hanya SUPERADMIN yang boleh menarik data publik." },
      { status: 403 }
    );
  }
  try {
    const { id } = await ctx.params;
    const input = datasetReviewSchema.parse(await req.json());
    await withdrawVersion(Number(id), session.id, input.note);
    return NextResponse.json({
      success: true,
      message: "Versi telah ditarik dari dashboard publik tanpa menghapus riwayat.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Gagal menarik versi." },
      { status: 400 }
    );
  }
}
