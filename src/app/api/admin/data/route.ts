import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getAdminSession, isSuperadmin } from "@/lib/auth";
import {
  beregamDatasets,
  beregamDataAudit,
  beregamDatasetVersions,
  beregamSyncRuns,
} from "@/lib/beregam/db/schema";
import { datasetAdminUpdateSchema } from "@/lib/schemas/dashboard-data";
import { revalidateTag } from "next/cache";
import { DASHBOARD_CACHE_TAG } from "@/lib/dashboard-data/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Belum masuk." }, { status: 401 });
  try {
    const datasets = await db.select().from(beregamDatasets)
      .orderBy(beregamDatasets.tema, beregamDatasets.featuredOrder, beregamDatasets.nama);
    const versions = await db.select().from(beregamDatasetVersions)
      .orderBy(desc(beregamDatasetVersions.createdAt)).limit(200);
    const runs = await db.select().from(beregamSyncRuns)
      .orderBy(desc(beregamSyncRuns.startedAt)).limit(20);
    const finishedRuns = runs.filter((run) => run.finishedAt);
    const averageSyncDurationMs = finishedRuns.length
      ? Math.round(finishedRuns.reduce((total, run) => total + (run.finishedAt!.getTime() - run.startedAt.getTime()), 0) / finishedRuns.length)
      : null;
    const metadataComplete = datasets.filter((dataset) =>
      dataset.nama && dataset.tema && dataset.definisi && dataset.sourceUrl &&
      (dataset.sourceType === "manual" || dataset.sourceRef)
    ).length;
    return NextResponse.json({
      success: true,
      datasets,
      versions,
      runs,
      isSuperadmin: isSuperadmin(session),
      metrics: {
        metadataComplete,
        metadataTotal: datasets.length,
        failedSyncRuns: runs.filter((run) => run.status === "failed" || run.status === "partial").length,
        averageSyncDurationMs,
      },
    });
  } catch (error) {
    console.error("[admin-data] GET gagal:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat pengelolaan data." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Belum masuk." }, { status: 401 });
  try {
    const input = await req.json() as { id?: unknown; data?: unknown };
    const id = Number(input.id);
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ success: false, message: "ID dataset tidak sah." }, { status: 400 });
    }
    const data = datasetAdminUpdateSchema.parse(input.data);
    const [current] = await db.select().from(beregamDatasets).where(eq(beregamDatasets.id, id)).limit(1);
    if (!current) return NextResponse.json({ success: false, message: "Dataset tidak ditemukan." }, { status: 404 });
    const sourceChanged = current.sourceType !== data.sourceType ||
      current.sourceRef !== (data.sourceRef ?? null) ||
      JSON.stringify(current.sourceConfig ?? null) !== JSON.stringify(data.sourceConfig ?? null) ||
      current.sourceUrl !== (data.sourceUrl ?? null) ||
      current.syncEnabled !== data.syncEnabled || current.isActive !== data.isActive;
    if (sourceChanged && !isSuperadmin(session)) {
      return NextResponse.json(
        { success: false, message: "Hanya SUPERADMIN yang boleh mengubah sumber atau status dataset." },
        { status: 403 }
      );
    }
    const next = {
      ...data,
      definisi: data.definisi ?? null,
      satuan: data.satuan ?? null,
      sourceRef: data.sourceRef ?? null,
      sourceConfig: data.sourceConfig ?? null,
      sourceUrl: data.sourceUrl ?? null,
      highlightTitle: data.highlightTitle ?? null,
      highlightNote: data.highlightNote ?? null,
    };
    await db.transaction(async (tx) => {
      await tx.update(beregamDatasets).set(next).where(eq(beregamDatasets.id, id));
      await tx.insert(beregamDataAudit).values({
        datasetId: id,
        action: sourceChanged ? "update_source_or_status" : "update_presentation",
        actorId: session.id,
        before: current,
        after: { ...current, ...next },
      });
    });
    revalidateTag(DASHBOARD_CACHE_TAG, "max");
    return NextResponse.json({ success: true, message: "Pengaturan dataset tersimpan." });
  } catch (error) {
    console.error("[admin-data] PATCH gagal:", error);
    return NextResponse.json({ success: false, message: "Data pengaturan tidak sah." }, { status: 400 });
  }
}
