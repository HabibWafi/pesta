import { NextResponse } from "next/server";
import { getAdminSession, isSuperadmin } from "@/lib/auth";
import { buatDrafManual } from "@/lib/dashboard-data/sync";
import { manualDatasetImportSchema } from "@/lib/schemas/dashboard-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Belum masuk." }, { status: 401 });
  if (!isSuperadmin(session)) {
    return NextResponse.json(
      { success: false, message: "Hanya SUPERADMIN yang boleh mengimpor data manual." },
      { status: 403 }
    );
  }
  try {
    const input = manualDatasetImportSchema.parse(await req.json());
    const result = await buatDrafManual(input, session.id);
    return NextResponse.json({
      success: true,
      message: "Impor manual disimpan sebagai draf dan belum ditayangkan.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Impor manual gagal." },
      { status: 400 }
    );
  }
}
