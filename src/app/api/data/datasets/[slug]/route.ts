import { NextResponse } from "next/server";
import { getDatasetDetail } from "@/lib/dashboard-data/queries";
import {
  DashboardFilterError,
  filterDashboardObservations,
  parseDashboardFilters,
} from "@/lib/dashboard-data/filter";
import { headerBatasDashboard, periksaBatasDashboard } from "@/lib/dashboard-data/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const batas = periksaBatasDashboard(req);
  if (!batas.boleh) {
    return NextResponse.json(
      { success: false, message: "Terlalu banyak permintaan. Silakan coba lagi sebentar." },
      { status: 429, headers: headerBatasDashboard(batas) }
    );
  }
  try {
    const { slug } = await ctx.params;
    const params = new URL(req.url).searchParams;
    if (params.getAll("page").length > 1 || params.getAll("limit").length > 1) {
      throw new DashboardFilterError("Parameter halaman tidak boleh diulang.");
    }
    const pageRaw = params.get("page") ?? "1";
    const limitRaw = params.get("limit") ?? "1000";
    if (!/^\d+$/.test(pageRaw) || !/^\d+$/.test(limitRaw)) {
      throw new DashboardFilterError("Parameter halaman harus berupa bilangan bulat positif.");
    }
    const page = Number(pageRaw);
    const limit = Number(limitRaw);
    if (page < 1 || limit < 1 || limit > 1000) {
      throw new DashboardFilterError("Batas halaman tidak sah.");
    }
    params.delete("page");
    params.delete("limit");
    const filters = parseDashboardFilters(params);
    const detail = await getDatasetDetail(slug);
    if (!detail) {
      return NextResponse.json(
        { success: false, message: "Dataset tidak ditemukan atau belum terverifikasi." },
        { status: 404, headers: headerBatasDashboard(batas) }
      );
    }
    const filtered = filterDashboardObservations(detail.observations, filters);
    const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
    const observations = filtered.slice((page - 1) * limit, page * limit);
    return NextResponse.json(
      {
        success: true,
        ...detail,
        observations,
        pagination: { page, limit, total: filtered.length, totalPages },
      },
      {
        headers: {
          ...headerBatasDashboard(batas),
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    if (error instanceof DashboardFilterError) {
      return NextResponse.json(
        { success: false, message: "Filter dataset tidak sah." },
        { status: 400, headers: headerBatasDashboard(batas) }
      );
    }
    console.error("[dashboard-data] gagal memuat detail:", error);
    return NextResponse.json(
      { success: false, message: "Dataset belum dapat dimuat." },
      { status: 500, headers: headerBatasDashboard(batas) }
    );
  }
}
