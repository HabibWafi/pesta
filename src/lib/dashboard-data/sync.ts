import { createHash } from "node:crypto";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import {
  beregamDatasets,
  beregamDataAudit,
  beregamDatasetVersions,
  beregamIndikator,
  beregamSyncRuns,
} from "@/lib/beregam/db/schema";
import {
  adaKunciBps,
  ambilDataDinamisLangsung,
  ambilDataSimdasiLangsung,
  type BpsDatasetResult,
} from "@/lib/beregam/bps-api";
import type { ManualDatasetImport } from "@/lib/schemas/dashboard-data";
import { DASHBOARD_CACHE_TAG } from "./queries";

export type SyncTrigger = "heartbeat" | "admin";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashDimensi(dimensi: Record<string, string>): string {
  return createHash("sha256").update(canonical(dimensi)).digest("hex");
}

function hashDataset(result: BpsDatasetResult): string {
  const observations = [...result.observations].sort((a, b) =>
    canonical(a).localeCompare(canonical(b))
  );
  return createHash("sha256")
    .update(canonical({ sourceRef: result.sourceRef, observations }))
    .digest("hex");
}

async function fetchDataset(dataset: typeof beregamDatasets.$inferSelect): Promise<BpsDatasetResult | null> {
  if (!dataset.sourceRef || !dataset.sourceConfig) return null;
  if (dataset.sourceType === "dynamic") {
    return ambilDataDinamisLangsung(dataset.sourceRef, dataset.sourceConfig);
  }
  if (dataset.sourceType === "simdasi") {
    return ambilDataSimdasiLangsung({
      ...dataset.sourceConfig,
      idTabel: dataset.sourceRef,
    });
  }
  return null;
}

function observationKey(item: {
  wilayahKode: string;
  periodeKode: string;
  dimensiHash: string;
}): string {
  return `${item.wilayahKode}|${item.periodeKode}|${item.dimensiHash}`;
}

type DraftResult =
  | { status: "created"; versionId: number }
  | { status: "unchanged"; versionId: number };

async function createDraft(
  dataset: typeof beregamDatasets.$inferSelect,
  result: BpsDatasetResult
): Promise<DraftResult> {
  if (result.observations.length === 0) {
    throw new Error(`Dataset ${dataset.kode} tidak menghasilkan observasi yang sah.`);
  }

  const contentHash = hashDataset(result);
  const [same] = await db
    .select({ id: beregamDatasetVersions.id })
    .from(beregamDatasetVersions)
    .where(
      and(
        eq(beregamDatasetVersions.datasetId, dataset.id),
        eq(beregamDatasetVersions.contentHash, contentHash)
      )
    )
    .limit(1);
  if (same) return { status: "unchanged", versionId: same.id };

  const [published] = await db
    .select({ id: beregamDatasetVersions.id })
    .from(beregamDatasetVersions)
    .where(
      and(
        eq(beregamDatasetVersions.datasetId, dataset.id),
        eq(beregamDatasetVersions.status, "published")
      )
    )
    .limit(1);
  const current = published
    ? await db
        .select({
          wilayahKode: beregamIndikator.wilayahKode,
          periodeKode: beregamIndikator.periodeKode,
          dimensiHash: beregamIndikator.dimensiHash,
          nilai: beregamIndikator.nilai,
        })
        .from(beregamIndikator)
        .where(
          and(
            eq(beregamIndikator.versionId, published.id),
            isNotNull(beregamIndikator.verifiedBy)
          )
        )
    : [];
  const oldMap = new Map(current.map((item) => [observationKey(item), item.nilai]));
  let added = 0;
  let changed = 0;
  const newKeys = new Set<string>();
  const prepared = result.observations.map((item) => {
    const dimensiHash = hashDimensi(item.dimensi);
    const key = observationKey({ ...item, dimensiHash });
    if (newKeys.has(key)) {
      throw new Error(`Observasi ganda ditemukan pada ${item.wilayahKode}, ${item.periodeKode}.`);
    }
    newKeys.add(key);
    if (!oldMap.has(key)) added += 1;
    else if (oldMap.get(key) !== item.nilai) changed += 1;
    return { ...item, dimensiHash };
  });
  const removed = [...oldMap.keys()].filter((key) => !newKeys.has(key)).length;

  const versionId = await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(beregamDatasetVersions).values({
      datasetId: dataset.id,
      status: "draft",
      contentHash,
      sourceUpdatedAt: result.sourceUpdatedAt,
      fetchedAt: new Date(),
      summary: { observations: prepared.length, added, changed, removed },
    });
    const versionId = Number(inserted.insertId);
    for (let offset = 0; offset < prepared.length; offset += 250) {
      await tx.insert(beregamIndikator).values(
        prepared.slice(offset, offset + 250).map((item) => ({
          datasetId: dataset.id,
          versionId,
          kode: dataset.kode,
          nama: dataset.nama,
          satuan: result.satuan ?? dataset.satuan,
          wilayahKode: item.wilayahKode,
          wilayahNama: item.wilayahNama,
          wilayahLevel: item.wilayahLevel,
          tahun: item.tahun,
          periode: item.periode,
          periodeKode: item.periodeKode,
          dimensi: item.dimensi,
          dimensiHash: item.dimensiHash,
          nilai: item.nilai,
          sumberPublikasi: result.nama,
          sourceRef: result.sourceRef,
          sourceUrl: dataset.sourceUrl ?? result.sourceUrl,
          sourceUpdatedAt: result.sourceUpdatedAt,
          catatan: result.catatan,
          verifiedBy: null,
        }))
      );
    }
    return versionId;
  });
  return { status: "created", versionId };
}

async function syncOne(dataset: typeof beregamDatasets.$inferSelect): Promise<"created" | "unchanged" | "skipped"> {
  const result = await fetchDataset(dataset);
  if (!result) return "skipped";
  return (await createDraft(dataset, result)).status;
}

/** Membuat versi draf dari input manual; data tetap harus ditinjau sebelum tayang. */
export async function buatDrafManual(
  input: ManualDatasetImport,
  userId: number
): Promise<{ versionId: number }> {
  const [dataset] = await db.select().from(beregamDatasets)
    .where(eq(beregamDatasets.id, input.datasetId))
    .limit(1);
  if (!dataset || dataset.sourceType !== "manual") {
    throw new Error("Dataset manual tidak ditemukan.");
  }
  if (!dataset.isActive) throw new Error("Dataset sedang tidak aktif.");

  const result: BpsDatasetResult = {
    nama: input.sumberPublikasi,
    satuan: dataset.satuan,
    definisi: dataset.definisi,
    catatan: input.catatan,
    sourceRef: `manual:${dataset.kode}`,
    sourceUrl: input.sourceUrl,
    sourceUpdatedAt: input.sourceUpdatedAt ? new Date(input.sourceUpdatedAt) : null,
    observations: input.observations,
  };
  const draft = await createDraft(dataset, result);
  if (draft.status === "unchanged") {
    throw new Error("Isi data sama dengan versi yang sudah tersimpan.");
  }
  await db.insert(beregamDataAudit).values({
    datasetId: dataset.id,
    versionId: draft.versionId,
    action: "import_manual_draft",
    actorId: userId,
    note: input.catatan,
    after: { observations: input.observations.length, sourceUrl: input.sourceUrl },
  });
  return { versionId: draft.versionId };
}

export async function sinkronisasiDataset(
  trigger: SyncTrigger,
  requestedBy: number | null = null
): Promise<{ checked: number; drafts: number; errors: string[] }> {
  const [run] = await db.insert(beregamSyncRuns).values({
    trigger,
    requestedBy,
    status: "running",
    startedAt: new Date(),
  });
  const runId = Number(run.insertId);
  if (!adaKunciBps()) {
    const error = "BPS_WEBAPI_KEY belum dikonfigurasi.";
    await db.update(beregamSyncRuns).set({ status: "failed", error, finishedAt: new Date() })
      .where(eq(beregamSyncRuns.id, runId));
    return { checked: 0, drafts: 0, errors: [error] };
  }

  const datasets = await db.select().from(beregamDatasets)
    .where(and(eq(beregamDatasets.isActive, true), eq(beregamDatasets.syncEnabled, true)));
  let drafts = 0;
  const errors: string[] = [];
  for (const dataset of datasets) {
    try {
      if ((await syncOne(dataset)) === "created") drafts += 1;
    } catch (error) {
      errors.push(`${dataset.kode}: ${String(error instanceof Error ? error.message : error).slice(0, 180)}`);
    }
  }
  const status = errors.length === 0 ? "done" : errors.length < datasets.length ? "partial" : "failed";
  await db.update(beregamSyncRuns).set({
    status,
    datasetsChecked: datasets.length,
    draftsCreated: drafts,
    error: errors.length ? errors.join("\n").slice(0, 4000) : null,
    finishedAt: new Date(),
  }).where(eq(beregamSyncRuns.id, runId));
  return { checked: datasets.length, drafts, errors };
}

export async function sinkronisasiHarianBilaPerlu(): Promise<boolean> {
  if (!adaKunciBps()) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recent] = await db.select({ id: beregamSyncRuns.id }).from(beregamSyncRuns)
    .where(and(gte(beregamSyncRuns.startedAt, since), inArray(beregamSyncRuns.status, ["running", "done", "partial"])))
    .orderBy(desc(beregamSyncRuns.startedAt)).limit(1);
  if (recent) return false;
  await sinkronisasiDataset("heartbeat");
  return true;
}

export async function publishVersion(versionId: number, userId: number, note?: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [version] = await tx.select().from(beregamDatasetVersions)
      .where(and(eq(beregamDatasetVersions.id, versionId), eq(beregamDatasetVersions.status, "draft")))
      .limit(1);
    if (!version) throw new Error("Versi draf tidak ditemukan.");
    await tx.select({ id: beregamDatasets.id }).from(beregamDatasets)
      .where(eq(beregamDatasets.id, version.datasetId))
      .for("update");
    const [count] = await tx.select({ total: sql<number>`count(*)` }).from(beregamIndikator)
      .where(eq(beregamIndikator.versionId, versionId));
    if (Number(count?.total ?? 0) === 0) throw new Error("Draf tidak mempunyai observasi.");
    await tx.update(beregamDatasetVersions).set({ status: "archived" })
      .where(and(eq(beregamDatasetVersions.datasetId, version.datasetId), eq(beregamDatasetVersions.status, "published")));
    await tx.update(beregamIndikator).set({ verifiedBy: userId })
      .where(eq(beregamIndikator.versionId, versionId));
    await tx.update(beregamDatasetVersions).set({
      status: "published",
      reviewedAt: new Date(),
      reviewedBy: userId,
      reviewNote: note?.trim() || null,
    }).where(eq(beregamDatasetVersions.id, versionId));
    await tx.insert(beregamDataAudit).values({
      datasetId: version.datasetId,
      versionId,
      action: "publish_version",
      actorId: userId,
      note: note?.trim() || null,
    });
  });
  revalidateTag(DASHBOARD_CACHE_TAG, "max");
}

export async function rejectVersion(versionId: number, userId: number, note?: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [version] = await tx.select().from(beregamDatasetVersions)
      .where(and(eq(beregamDatasetVersions.id, versionId), eq(beregamDatasetVersions.status, "draft"))).limit(1);
    if (!version) throw new Error("Versi draf tidak ditemukan.");
    await tx.update(beregamDatasetVersions).set({
      status: "rejected",
      reviewedAt: new Date(),
      reviewedBy: userId,
      reviewNote: note?.trim() || null,
    }).where(eq(beregamDatasetVersions.id, versionId));
    await tx.insert(beregamDataAudit).values({
      datasetId: version.datasetId,
      versionId,
      action: "reject_version",
      actorId: userId,
      note: note?.trim() || null,
    });
  });
}

/** Menarik versi aktif tanpa menghapus riwayat maupun observasinya. */
export async function withdrawVersion(versionId: number, userId: number, note?: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [initial] = await tx.select().from(beregamDatasetVersions)
      .where(eq(beregamDatasetVersions.id, versionId)).limit(1);
    if (!initial) throw new Error("Versi tidak ditemukan.");
    await tx.select({ id: beregamDatasets.id }).from(beregamDatasets)
      .where(eq(beregamDatasets.id, initial.datasetId))
      .for("update");
    const [version] = await tx.select().from(beregamDatasetVersions)
      .where(and(
        eq(beregamDatasetVersions.id, versionId),
        eq(beregamDatasetVersions.status, "published")
      )).limit(1);
    if (!version) throw new Error("Versi terpublikasi tidak ditemukan.");
    await tx.update(beregamDatasetVersions).set({
      status: "archived",
      reviewedAt: new Date(),
      reviewedBy: userId,
      reviewNote: note?.trim() || null,
    }).where(eq(beregamDatasetVersions.id, versionId));
    await tx.insert(beregamDataAudit).values({
      datasetId: version.datasetId,
      versionId,
      action: "withdraw_version",
      actorId: userId,
      note: note?.trim() || null,
    });
  });
  revalidateTag(DASHBOARD_CACHE_TAG, "max");
}
