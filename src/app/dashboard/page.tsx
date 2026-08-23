import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { keadaanFitur, metadataFitur, PitaPratayang } from "@/components/PratayangBelumTayang";
import DashboardClient from "./DashboardClient";

/**
 * Dashboard Data masih dikembangkan, dijaga saklar `tampilan.dashboard`
 * di /admin/konten. Lihat catatan di ../sinta/page.tsx.
 */
export function generateMetadata(): Promise<Metadata> {
  return metadataFitur("tampilan.dashboard", "Dashboard Data Strategis BPS Musi Rawas");
}
export default async function DashboardPage() {
  const keadaan = await keadaanFitur("tampilan.dashboard");
  if (keadaan === "tertutup") notFound();

  return (
    <>
      {keadaan === "pratayang" && <PitaPratayang nama="Dashboard Data" />}
      <DashboardClient />
    </>
  );
}
