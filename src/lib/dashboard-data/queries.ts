import { cache } from "react";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  beregamDatasets,
  beregamDatasetVersions,
  beregamIndikator,
} from "@/lib/beregam/db/schema";
import type {
  DatasetDetail,
  DatasetRingkas,
  ObservasiDashboard,
} from "@/lib/schemas/dashboard-data";

export const DASHBOARD_CACHE_TAG = "dashboard-data";

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

async function katalogMentah(): Promise<DatasetRingkas[]> {
  const rows = await db
    .select({
      dataset: beregamDatasets,
      versionId: beregamDatasetVersions.id,
      sourceUpdatedAt: beregamDatasetVersions.sourceUpdatedAt,
    })
    .from(beregamDatasets)
    .innerJoin(
      beregamDatasetVersions,
      and(
        eq(beregamDatasetVersions.datasetId, beregamDatasets.id),
        eq(beregamDatasetVersions.status, "published")
      )
    )
    .where(eq(beregamDatasets.isActive, true))
    .orderBy(asc(beregamDatasets.tema), asc(beregamDatasets.nama));

  const hasil: DatasetRingkas[] = [];
  for (const row of rows) {
    let latestPeriod: string | null = null;
    let latestValue: string | null = null;
    let levels: DatasetRingkas["levels"] = [];
    if (row.versionId) {
      const observations = await db
        .select({
          periode: beregamIndikator.periode,
          periodeKode: beregamIndikator.periodeKode,
          nilai: beregamIndikator.nilai,
          level: beregamIndikator.wilayahLevel,
        })
        .from(beregamIndikator)
        .where(
          and(
            eq(beregamIndikator.versionId, row.versionId),
            isNotNull(beregamIndikator.verifiedBy)
          )
        )
        .orderBy(desc(beregamIndikator.tahun), desc(beregamIndikator.periodeKode));
      latestPeriod = observations[0]?.periode ?? observations[0]?.periodeKode ?? null;
      const latestCode = observations[0]?.periodeKode;
      const latestRows = latestCode ? observations.filter((item) => item.periodeKode === latestCode) : [];
      // Jangan memilih angka highlight secara sewenang-wenang dari dataset
      // multidimensi. Admin tetap dapat menyorot datasetnya, tetapi kartu
      // angka baru tampil bila periode terbaru hanya punya satu observasi.
      latestValue = latestRows.length === 1 ? latestRows[0].nilai : null;
      levels = [...new Set(observations.map((item) => item.level))];
    }

    const d = row.dataset;
    hasil.push({
      id: d.id,
      kode: d.kode,
      slug: d.slug,
      nama: d.nama,
      tema: d.tema,
      satuan: d.satuan,
      defaultView: d.defaultView,
      isFeatured: d.isFeatured,
      featuredOrder: d.featuredOrder,
      highlightTitle: d.highlightTitle,
      highlightNote: d.highlightNote,
      latestPeriod,
      latestValue,
      levels,
      sourceUrl: d.sourceUrl,
      sourceUpdatedAt: iso(row.sourceUpdatedAt),
    });
  }
  return hasil;
}

const katalogCached = unstable_cache(katalogMentah, ["dashboard-katalog"], {
  revalidate: 3600,
  tags: [DASHBOARD_CACHE_TAG],
});

export const getDashboardCatalog = cache(katalogCached);

async function detailMentah(slug: string): Promise<DatasetDetail | null> {
  const [row] = await db
    .select({ dataset: beregamDatasets, version: beregamDatasetVersions })
    .from(beregamDatasets)
    .innerJoin(
      beregamDatasetVersions,
      and(
        eq(beregamDatasetVersions.datasetId, beregamDatasets.id),
        eq(beregamDatasetVersions.status, "published")
      )
    )
    .where(and(eq(beregamDatasets.slug, slug), eq(beregamDatasets.isActive, true)))
    .limit(1);
  if (!row) return null;

  const observations = await db
    .select()
    .from(beregamIndikator)
    .where(
      and(
        eq(beregamIndikator.datasetId, row.dataset.id),
        eq(beregamIndikator.versionId, row.version.id),
        isNotNull(beregamIndikator.verifiedBy)
      )
    )
    .orderBy(asc(beregamIndikator.tahun), asc(beregamIndikator.periodeKode), asc(beregamIndikator.id));

  const mapped: ObservasiDashboard[] = observations.map((item) => ({
    id: item.id,
    periodeKode: item.periodeKode,
    periode: item.periode ?? item.periodeKode,
    tahun: item.tahun,
    wilayahKode: item.wilayahKode,
    wilayahNama: item.wilayahNama ?? item.wilayahKode,
    wilayahLevel: item.wilayahLevel,
    dimensi: item.dimensi ?? {},
    nilai: item.nilai,
    satuan: item.satuan ?? row.dataset.satuan,
    catatan: item.catatan,
  }));

  const periods = [...new Map(mapped.map((o) => [o.periodeKode, o.periode])).entries()]
    .map(([kode, label]) => ({ kode, label }));
  const areas = [...new Map(mapped.map((o) => [
    `${o.wilayahLevel}:${o.wilayahKode}`,
    { kode: o.wilayahKode, nama: o.wilayahNama, level: o.wilayahLevel },
  ])).values()];
  const dimensionOptions: Record<string, string[]> = {};
  for (const observation of mapped) {
    for (const [key, value] of Object.entries(observation.dimensi)) {
      dimensionOptions[key] ??= [];
      if (!dimensionOptions[key].includes(value)) dimensionOptions[key].push(value);
    }
  }

  const latestCode = mapped.at(-1)?.periodeKode;
  const latestRows = latestCode ? mapped.filter((item) => item.periodeKode === latestCode) : [];

  return {
    dataset: {
      id: row.dataset.id,
      kode: row.dataset.kode,
      slug: row.dataset.slug,
      nama: row.dataset.nama,
      tema: row.dataset.tema,
      definisi: row.dataset.definisi,
      satuan: row.dataset.satuan,
      defaultView: row.dataset.defaultView,
      isFeatured: row.dataset.isFeatured,
      featuredOrder: row.dataset.featuredOrder,
      highlightTitle: row.dataset.highlightTitle,
      highlightNote: row.dataset.highlightNote,
      latestPeriod: mapped.at(-1)?.periode ?? null,
      latestValue: latestRows.length === 1 ? latestRows[0].nilai : null,
      levels: [...new Set(mapped.map((o) => o.wilayahLevel))],
      sourceUrl: row.dataset.sourceUrl,
      sourceUpdatedAt: iso(row.version.sourceUpdatedAt),
      sumberPublikasi: observations[0]?.sumberPublikasi ?? null,
    },
    observations: mapped,
    periods,
    areas,
    dimensionOptions,
  };
}

export const getDatasetDetail = cache(async (slug: string) =>
  unstable_cache(() => detailMentah(slug), ["dashboard-detail", slug], {
    revalidate: 3600,
    tags: [DASHBOARD_CACHE_TAG, `${DASHBOARD_CACHE_TAG}:${slug}`],
  })()
);
