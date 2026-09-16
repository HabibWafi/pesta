import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { keadaanFitur, metadataFitur, PitaPratayang } from "@/components/PratayangBelumTayang";
import { getDashboardCatalog } from "@/lib/dashboard-data/queries";
import DashboardClient, { type DashboardInitialSelection } from "./DashboardClient";

// Wajib dinamis karena keputusan tayang/pratayang bergantung pada nilai
// database dan cookie admin. Respons ini tidak boleh menjadi 404 bersama
// yang tersimpan lalu disajikan kembali kepada petugas atau warga.
export const dynamic = "force-dynamic";

/**
 * Saklar `tampilan.dashboard` memungkinkan verifikasi internal dan rollback
 * cepat tanpa menghapus data atau riwayat publikasi.
 */
export function generateMetadata(): Promise<Metadata> {
  return metadataFitur("tampilan.dashboard", "Dashboard Data Strategis BPS Musi Rawas");
}
function single(value: string | string[] | undefined, max: number): string | undefined {
  const result = Array.isArray(value) ? value[0] : value;
  return result && result.length <= max ? result : undefined;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const keadaan = await keadaanFitur("tampilan.dashboard");
  if (keadaan === "tertutup") notFound();
  const [hasilKatalog, rawParams] = await Promise.all([
    getDashboardCatalog()
      .then((datasets) => ({ datasets, gagal: false }))
      .catch((error: unknown) => {
        // Halaman pratayang tetap harus bisa diperiksa walau sumber data
        // sementara bermasalah atau migration belum selesai dijalankan.
        // Jangan mengarang data pengganti; tampilkan keadaan kosong yang jelas.
        console.error("[dashboard-data] katalog halaman gagal dimuat:", error);
        return { datasets: [], gagal: true };
      }),
    searchParams,
  ]);
  const datasets = hasilKatalog.datasets;
  const dimensions = Object.fromEntries(Object.entries(rawParams)
    .filter(([key, value]) => key.startsWith("dim.") && key.length > 4 && key.length <= 84 && single(value, 160))
    .map(([key, value]) => [key.slice(4), single(value, 160)!]));
  const view = single(rawParams.view, 20);
  const allowedViews = new Set(["number", "line", "bar", "stacked", "composition", "map"]);
  const areaLevel = single(rawParams.areaLevel, 20);
  const allowedAreaLevels = new Set(["kabupaten", "kecamatan", "desa"]);
  const initialSelection: DashboardInitialSelection = {
    slug: single(rawParams.dataset, 120),
    period: single(rawParams.period, 40),
    areaLevel: areaLevel && allowedAreaLevels.has(areaLevel) ? areaLevel : undefined,
    areaCode: single(rawParams.areaCode, 30),
    dimensions,
    view: view && allowedViews.has(view) ? view as DashboardInitialSelection["view"] : undefined,
  };

  return (
    <>
      {keadaan === "pratayang" && <PitaPratayang nama="Dashboard Data" />}
      <DashboardClient
        initialDatasets={datasets}
        initialSelection={initialSelection}
        initialLoadError={hasilKatalog.gagal}
      />
    </>
  );
}
