import { NextResponse } from "next/server";
import { getAdminSession, isSuperadmin } from "@/lib/auth";
import { publishVersion } from "@/lib/dashboard-data/sync";
import { datasetReviewSchema } from "@/lib/schemas/dashboard-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Belum masuk." }, { status: 401 });
  if (!isSuperadmin(session)) {
    return NextResponse.json(
      { success: false, message: "Hanya SUPERADMIN yang boleh menerbitkan data." },
      { status: 403 }
    );
  }
  try {
    const { id } = await ctx.params;
    const input = datasetReviewSchema.parse(await req.json());
    await publishVersion(Number(id), session.id, input.note);
    return NextResponse.json({ success: true, message: "Versi telah diverifikasi dan ditayangkan." });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Gagal menayangkan versi." },
      { status: 400 }
    );
  }
}
