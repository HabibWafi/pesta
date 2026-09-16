import { NextResponse } from "next/server";
import { getAdminSession, isSuperadmin } from "@/lib/auth";
import { rejectVersion } from "@/lib/dashboard-data/sync";
import { datasetReviewSchema } from "@/lib/schemas/dashboard-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Belum masuk." }, { status: 401 });
  if (!isSuperadmin(session)) {
    return NextResponse.json(
      { success: false, message: "Hanya SUPERADMIN yang boleh menolak draf." },
      { status: 403 }
    );
  }
  try {
    const { id } = await ctx.params;
    const input = datasetReviewSchema.parse(await req.json());
    await rejectVersion(Number(id), session.id, input.note);
    return NextResponse.json({ success: true, message: "Draf ditolak; versi publik tidak berubah." });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Gagal menolak draf." },
      { status: 400 }
    );
  }
}
