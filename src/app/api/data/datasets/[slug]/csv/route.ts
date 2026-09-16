import { getDatasetDetail } from "@/lib/dashboard-data/queries";
import {
  DashboardFilterError,
  filterDashboardObservations,
  parseDashboardFilters,
} from "@/lib/dashboard-data/filter";
import { bangunCsv } from "@/lib/csv";
import { headerBatasDashboard, periksaBatasDashboard } from "@/lib/dashboard-data/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const batas = periksaBatasDashboard(req);
  if (!batas.boleh) {
    return Response.json(
      { success: false, message: "Terlalu banyak permintaan. Silakan coba lagi sebentar." },
      { status: 429, headers: headerBatasDashboard(batas) }
    );
  }
  try {
    const { slug } = await ctx.params;
    const filters = parseDashboardFilters(new URL(req.url).searchParams);
    const detail = await getDatasetDetail(slug);
    if (!detail) {
      return Response.json(
        { success: false, message: "Dataset tidak ditemukan." },
        { status: 404, headers: headerBatasDashboard(batas) }
      );
    }
    const rows = filterDashboardObservations(detail.observations, filters);
    if (rows.length > 50_000) {
      return Response.json(
        { success: false, message: "Data terlalu besar untuk satu unduhan. Persempit filter terlebih dahulu." },
        { status: 413, headers: headerBatasDashboard(batas) }
      );
    }
    const dimensionKeys = [...new Set(rows.flatMap((item) => Object.keys(item.dimensi)))];
    const header = [
      "Kode Dataset",
      "Indikator",
      "Periode",
      "Tahun",
      "Kode Wilayah",
      "Nama Wilayah",
      "Level Wilayah",
      ...dimensionKeys,
      "Nilai",
      "Satuan",
      "Catatan",
      "Sumber",
      "URL Sumber",
      "Pembaruan Sumber",
    ];
    const body = bangunCsv(header, rows.map((item) => [
      detail.dataset.kode,
      detail.dataset.nama,
      item.periode,
      item.tahun,
      item.wilayahKode,
      item.wilayahNama,
      item.wilayahLevel,
      ...dimensionKeys.map((key) => item.dimensi[key] ?? ""),
      item.nilai,
      item.satuan ?? "",
      item.catatan ?? "",
      detail.dataset.sumberPublikasi ?? "Badan Pusat Statistik",
      detail.dataset.sourceUrl ?? "",
      detail.dataset.sourceUpdatedAt ?? "",
    ]));
    return new Response(body, {
      headers: {
        ...headerBatasDashboard(batas),
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.csv"`,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    if (error instanceof DashboardFilterError) {
      return Response.json(
        { success: false, message: "Filter dataset tidak sah." },
        { status: 400, headers: headerBatasDashboard(batas) }
      );
    }
    console.error("[dashboard-data] gagal membuat CSV:", error);
    return Response.json(
      { success: false, message: "CSV belum dapat dibuat." },
      { status: 500, headers: headerBatasDashboard(batas) }
    );
  }
}
