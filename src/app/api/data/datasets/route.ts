import { NextResponse } from "next/server";
import { getDashboardCatalog } from "@/lib/dashboard-data/queries";
import { dashboardCatalogFilterSchema } from "@/lib/schemas/dashboard-data";
import { headerBatasDashboard, periksaBatasDashboard } from "@/lib/dashboard-data/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const batas = periksaBatasDashboard(req);
  if (!batas.boleh) {
    return NextResponse.json(
      { success: false, message: "Terlalu banyak permintaan. Silakan coba lagi sebentar." },
      { status: 429, headers: headerBatasDashboard(batas) }
    );
  }
  try {
    const params = new URL(req.url).searchParams;
    const allowed = new Set(["q", "tema", "featured"]);
    for (const key of params.keys()) {
      if (!allowed.has(key) || params.getAll(key).length > 1) {
        return NextResponse.json(
          { success: false, message: `Filter ${key} tidak sah.` },
          { status: 400, headers: headerBatasDashboard(batas) }
        );
      }
    }
    const parsed = dashboardCatalogFilterSchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Filter katalog tidak sah." },
        { status: 400, headers: headerBatasDashboard(batas) }
      );
    }
    const q = parsed.data.q.toLocaleLowerCase("id");
    const tema = parsed.data.tema.toLocaleLowerCase("id");
    const featured = parsed.data.featured === "1";
    const all = await getDashboardCatalog();
    const datasets = all.filter((item) =>
      (!q || `${item.nama} ${item.tema}`.toLocaleLowerCase("id").includes(q)) &&
      (!tema || item.tema.toLocaleLowerCase("id") === tema) &&
      (!featured || item.isFeatured)
    ).sort((a, b) => featured
      ? a.featuredOrder - b.featuredOrder
      : a.tema.localeCompare(b.tema, "id") || a.nama.localeCompare(b.nama, "id"));
    return NextResponse.json(
      { success: true, datasets },
      {
        headers: {
          ...headerBatasDashboard(batas),
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[dashboard-data] gagal memuat katalog:", error);
    return NextResponse.json(
      { success: false, message: "Data terverifikasi belum dapat dimuat." },
      { status: 500, headers: headerBatasDashboard(batas) }
    );
  }
}
