import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { beregamDatasets, beregamDatasetVersions, beregamIndikator } from "@/lib/beregam/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function observationKey(row: typeof beregamIndikator.$inferSelect): string {
  return [row.periodeKode, row.wilayahKode, row.dimensiHash].join("|");
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Belum masuk." }, { status: 401 });
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ success: false, message: "ID versi tidak sah." }, { status: 400 });
    const [version] = await db.select().from(beregamDatasetVersions).where(eq(beregamDatasetVersions.id, id)).limit(1);
    if (!version) return NextResponse.json({ success: false, message: "Versi tidak ditemukan." }, { status: 404 });
    const [dataset] = await db.select().from(beregamDatasets).where(eq(beregamDatasets.id, version.datasetId)).limit(1);
    const current = await db.select().from(beregamIndikator).where(eq(beregamIndikator.versionId, version.id));
    const [publishedVersion] = await db.select().from(beregamDatasetVersions).where(and(eq(beregamDatasetVersions.datasetId, version.datasetId), eq(beregamDatasetVersions.status, "published"))).limit(1);
    const previous = publishedVersion ? await db.select().from(beregamIndikator).where(eq(beregamIndikator.versionId, publishedVersion.id)) : [];
    const previousByKey = new Map(previous.map((row) => [observationKey(row), row]));
    const currentKeys = new Set(current.map(observationKey));
    const observations = current.map((row) => {
      const before = previousByKey.get(observationKey(row));
      return {
        id: row.id,
        periode: row.periode ?? row.periodeKode,
        wilayah: row.wilayahNama ?? row.wilayahKode,
        level: row.wilayahLevel,
        dimensi: row.dimensi ?? {},
        nilai: row.nilai,
        nilaiSebelumnya: before?.nilai ?? null,
        satuan: row.satuan ?? dataset?.satuan ?? null,
        status: !before ? "baru" : before.nilai !== row.nilai || before.satuan !== row.satuan ? "berubah" : "tetap",
      };
    });
    const removed = previous.filter((row) => !currentKeys.has(observationKey(row))).map((row) => ({
      id: row.id,
      periode: row.periode ?? row.periodeKode,
      wilayah: row.wilayahNama ?? row.wilayahKode,
      level: row.wilayahLevel,
      dimensi: row.dimensi ?? {},
      nilai: null,
      nilaiSebelumnya: row.nilai,
      satuan: row.satuan ?? dataset?.satuan ?? null,
      status: "hilang",
    }));
    return NextResponse.json({
      success: true,
      dataset,
      version,
      source: {
        title: current[0]?.sumberPublikasi ?? null,
        url: current[0]?.sourceUrl ?? dataset?.sourceUrl ?? null,
        updatedAt: current[0]?.sourceUpdatedAt ?? version.sourceUpdatedAt,
        note: current[0]?.catatan ?? null,
      },
      observations: [...observations, ...removed],
    });
  } catch (error) {
    console.error("[admin-data] detail versi gagal:", error);
    return NextResponse.json({ success: false, message: "Rincian versi gagal dimuat." }, { status: 500 });
  }
}
