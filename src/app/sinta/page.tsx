import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { keadaanFitur, metadataFitur, PitaPratayang } from "@/components/PratayangBelumTayang";
import SintaClient from "./SintaClient";

/**
 * Sinta masih dikembangkan, jadi halamannya dijaga saklar
 * `tampilan.sinta` di /admin/konten.
 *
 * Isi halamannya tetap komponen klien seperti sebelumnya (SintaClient);
 * pembungkus ini Server Component supaya saklarnya dibaca di server, bukan
 * bergantung pada JavaScript yang berjalan di peramban warga.
 */
export function generateMetadata(): Promise<Metadata> {
  return metadataFitur("tampilan.sinta", "Sinta - Asisten Digital BPS Musi Rawas");
}

export default async function SintaPage() {
  const keadaan = await keadaanFitur("tampilan.sinta");
  if (keadaan === "tertutup") notFound();

  return (
    <>
      {keadaan === "pratayang" && <PitaPratayang nama="Sinta (asisten AI)" />}
      <SintaClient />
    </>
  );
}
