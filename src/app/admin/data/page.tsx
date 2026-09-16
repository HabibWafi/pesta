"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Database, Eye, EyeOff, Pencil, RefreshCw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { BeregamDataset, BeregamDatasetVersion, BeregamSyncRun } from "@/lib/beregam/db/schema";

type ApiDataset = Omit<BeregamDataset, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };
type ApiVersion = Omit<BeregamDatasetVersion, "createdAt" | "fetchedAt" | "reviewedAt" | "sourceUpdatedAt"> & {
  createdAt: string;
  fetchedAt: string;
  reviewedAt: string | null;
  sourceUpdatedAt: string | null;
};
type ApiRun = Omit<BeregamSyncRun, "createdAt" | "startedAt" | "finishedAt"> & {
  createdAt: string;
  startedAt: string;
  finishedAt: string | null;
};

interface Payload {
  datasets: ApiDataset[];
  versions: ApiVersion[];
  runs: ApiRun[];
  isSuperadmin: boolean;
  metrics: {
    metadataComplete: number;
    metadataTotal: number;
    failedSyncRuns: number;
    averageSyncDurationMs: number | null;
  };
}

interface ReviewData {
  dataset: ApiDataset;
  version: ApiVersion;
  source: {
    title: string | null;
    url: string | null;
    updatedAt: string | null;
    note: string | null;
  };
  observations: Array<{
    id: number;
    periode: string;
    wilayah: string;
    level: string;
    dimensi: Record<string, string>;
    nilai: string | null;
    nilaiSebelumnya: string | null;
    satuan: string | null;
    status: "baru" | "berubah" | "tetap" | "hilang";
  }>;
}

function tanggal(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export default function AdminDataPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState<ApiDataset | null>(null);
  const [reviewing, setReviewing] = useState<ReviewData | null>(null);
  const [configText, setConfigText] = useState("{}");
  const [reviewNote, setReviewNote] = useState("");
  const [manualDataset, setManualDataset] = useState<ApiDataset | null>(null);
  const [manualText, setManualText] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/data", { cache: "no-store" });
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      setData(json);
    } catch (error) {
      toast.error("Gagal memuat pengelolaan data", { description: error instanceof Error ? error.message : "Terjadi kendala." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Pola client-fetch mengikuti seluruh halaman admin yang sudah ada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const drafts = useMemo(() => data?.versions.filter((item) => item.status === "draft") ?? [], [data]);
  const published = useMemo(() => data?.versions.filter((item) => item.status === "published") ?? [], [data]);
  const datasetById = useMemo(() => new Map(data?.datasets.map((item) => [item.id, item]) ?? []), [data]);

  async function sync() {
    setWorking(true);
    try {
      const response = await fetch("/api/admin/data/sync", { method: "POST" });
      const json = await response.json();
      if (!json.success) throw new Error(`${json.message}${json.errors?.length ? ` ${json.errors.join("; ")}` : ""}`);
      toast.success(json.message);
      await load();
    } catch (error) {
      toast.error("Sinkronisasi belum selesai", { description: error instanceof Error ? error.message : "Terjadi kendala." });
    } finally { setWorking(false); }
  }

  async function review(versionId: number, action: "publish" | "reject", note: string) {
    if (note.trim().length < 3) {
      toast.error("Catatan peninjauan minimal 3 karakter.");
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(`/api/admin/data/versions/${versionId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message);
      setReviewing(null);
      setReviewNote("");
      await load();
    } catch (error) {
      toast.error("Tindakan gagal", { description: error instanceof Error ? error.message : "Terjadi kendala." });
    } finally { setWorking(false); }
  }

  async function openReview(versionId: number) {
    setWorking(true);
    try {
      const response = await fetch(`/api/admin/data/versions/${versionId}`, { cache: "no-store" });
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      setReviewing(json);
      setReviewNote("");
    } catch (error) {
      toast.error("Rincian draf gagal dimuat", { description: error instanceof Error ? error.message : "Terjadi kendala." });
    } finally { setWorking(false); }
  }

  function openManual(dataset: ApiDataset) {
    setManualDataset(dataset);
    setManualText(JSON.stringify({
      sumberPublikasi: "BPS Kabupaten Musi Rawas",
      sourceUrl: dataset.sourceUrl ?? "https://musirawaskab.bps.go.id/",
      sourceUpdatedAt: new Date().toISOString(),
      catatan: "Input manual berdasarkan sumber resmi yang tercantum.",
      observations: [{
        periodeKode: String(new Date().getFullYear()),
        periode: String(new Date().getFullYear()),
        tahun: new Date().getFullYear(),
        wilayahKode: "1605",
        wilayahNama: "Kabupaten Musi Rawas",
        wilayahLevel: "kabupaten",
        dimensi: {},
        nilai: "0",
      }],
    }, null, 2));
  }

  async function importManual() {
    if (!manualDataset) return;
    let body: Record<string, unknown>;
    try { body = JSON.parse(manualText) as Record<string, unknown>; }
    catch { toast.error("Data impor harus berupa JSON yang sah."); return; }
    setWorking(true);
    try {
      const response = await fetch("/api/admin/data/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, datasetId: manualDataset.id }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message);
      setManualDataset(null);
      await load();
    } catch (error) {
      toast.error("Impor manual gagal", { description: error instanceof Error ? error.message : "Terjadi kendala." });
    } finally { setWorking(false); }
  }

  async function withdraw(versionId: number) {
    const note = window.prompt("Tuliskan alasan penarikan versi dari dashboard publik:");
    if (note === null) return;
    if (note.trim().length < 3) {
      toast.error("Alasan penarikan minimal 3 karakter.");
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(`/api/admin/data/versions/${versionId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message);
      await load();
    } catch (error) {
      toast.error("Penarikan gagal", { description: error instanceof Error ? error.message : "Terjadi kendala." });
    } finally { setWorking(false); }
  }

  function startEdit(dataset: ApiDataset) {
    setEditing({ ...dataset });
    setConfigText(JSON.stringify(dataset.sourceConfig ?? {}, null, 2));
  }

  async function save() {
    if (!editing) return;
    let sourceConfig: Record<string, unknown>;
    try { sourceConfig = JSON.parse(configText) as Record<string, unknown>; }
    catch { toast.error("Konfigurasi sumber harus berupa JSON yang sah."); return; }
    setWorking(true);
    try {
      const response = await fetch("/api/admin/data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          data: {
            nama: editing.nama,
            tema: editing.tema,
            definisi: editing.definisi,
            satuan: editing.satuan,
            sourceType: editing.sourceType,
            sourceRef: editing.sourceRef,
            sourceConfig,
            sourceUrl: editing.sourceUrl,
            defaultView: editing.defaultView,
            isFeatured: editing.isFeatured,
            featuredOrder: editing.featuredOrder,
            highlightTitle: editing.highlightTitle,
            highlightNote: editing.highlightNote,
            isActive: editing.isActive,
            syncEnabled: editing.syncEnabled,
          },
        }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message);
      setEditing(null);
      await load();
    } catch (error) {
      toast.error("Gagal menyimpan dataset", { description: error instanceof Error ? error.message : "Terjadi kendala." });
    } finally { setWorking(false); }
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Memuat pengelolaan Dashboard Data...</div>;

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Kelola Dashboard Data</h1>
          <p className="mt-1 text-sm text-slate-500">Sinkronkan Web API BPS, periksa perubahan, lalu tayangkan versi terverifikasi.</p>
        </div>
        <button disabled={working || !data?.isSuperadmin} onClick={() => void sync()} title={!data?.isSuperadmin ? "Hanya SUPERADMIN yang dapat menjalankan sinkronisasi" : undefined} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${working ? "animate-spin" : ""}`} /> Periksa Pembaruan BPS
        </button>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <strong>{drafts.length} draf menunggu verifikasi.</strong> Data draf tidak dapat dilihat publik atau dikutip SINTA. Versi terverifikasi terakhir tetap tayang.
      </section>

      {data && <section aria-labelledby="health-title"><h2 id="health-title" className="sr-only">Kesehatan operasional dashboard</h2><div className="grid gap-3 sm:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">Kelengkapan metadata</p><p className="mt-2 text-2xl font-black text-slate-900">{data.metrics.metadataComplete}/{data.metrics.metadataTotal}</p><p className="mt-1 text-xs text-slate-500">Dataset dengan definisi dan sumber lengkap</p></article><article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">Kendala sinkronisasi</p><p className="mt-2 text-2xl font-black text-slate-900">{data.metrics.failedSyncRuns}</p><p className="mt-1 text-xs text-slate-500">Run gagal atau parsial dari 20 terakhir</p></article><article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">Rata-rata durasi</p><p className="mt-2 text-2xl font-black text-slate-900">{data.metrics.averageSyncDurationMs === null ? "-" : `${(data.metrics.averageSyncDurationMs / 1000).toFixed(1)} dtk`}</p><p className="mt-1 text-xs text-slate-500">Sinkronisasi yang telah selesai</p></article></div></section>}

      {drafts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black">Antrean Tinjau</h2>
          {drafts.map((version) => {
            const dataset = datasetById.get(version.datasetId);
            const summary = version.summary ?? { observations: 0, added: 0, changed: 0, removed: 0 };
            return <div key={version.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-900">{dataset?.nama ?? `Dataset ${version.datasetId}`}</p>
                <p className="mt-1 text-xs text-slate-500">Diambil {tanggal(version.fetchedAt)} · {summary.observations} observasi · +{summary.added} baru · {summary.changed} berubah · {summary.removed} hilang</p>
              </div>
              <div className="flex gap-2">
                <button disabled={working} onClick={() => void openReview(version.id)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700"><Eye className="h-4 w-4" /> Rincian dan tinjau</button>
              </div>
            </div>;
          })}
        </section>
      )}

      {published.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black">Versi Aktif</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {published.map((version) => {
              const dataset = datasetById.get(version.datasetId);
              return <article key={version.id} className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div><p className="font-bold text-slate-900">{dataset?.nama ?? `Dataset ${version.datasetId}`}</p><p className="mt-1 text-xs text-slate-600">Ditayangkan {tanggal(version.reviewedAt)} · versi {version.id}</p></div>
                <button disabled={working || !data?.isSuperadmin} onClick={() => void withdraw(version.id)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"><EyeOff className="h-4 w-4" /> Tarik</button>
              </article>;
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2"><Database className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-black">Katalog Indikator</h2></div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Indikator</th><th className="p-4">Tema</th><th className="p-4">Sumber</th><th className="p-4">Keadaan</th><th className="p-4">Aksi</th></tr></thead>
            <tbody>{data?.datasets.map((dataset) => <tr key={dataset.id} className="border-t border-slate-100">
              <td className="p-4"><p className="font-bold text-slate-900">{dataset.nama}</p><p className="text-xs text-slate-400">{dataset.kode}</p></td>
              <td className="p-4 text-slate-600">{dataset.tema}</td>
              <td className="p-4 text-xs text-slate-600">{dataset.sourceRef || "Belum dipetakan"}</td>
              <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${dataset.syncEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{dataset.syncEnabled ? "Sinkron aktif" : "Belum aktif"}</span></td>
              <td className="p-4"><div className="flex flex-wrap gap-3"><button onClick={() => startEdit(dataset)} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-indigo-700"><Pencil className="h-4 w-4" /> Atur</button>{dataset.sourceType === "manual" && <button disabled={!data?.isSuperadmin} onClick={() => openManual(dataset)} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-emerald-700 disabled:opacity-40"><Upload className="h-4 w-4" /> Impor</button>}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-black">Sinkronisasi terakhir</h2>
        <p className="mt-2 text-sm text-slate-600">{data?.runs[0] ? `${tanggal(data.runs[0].startedAt)} · ${data.runs[0].status} · ${data.runs[0].draftsCreated} draf` : "Belum pernah dijalankan."}</p>
      </section>

      {reviewing && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="review-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b p-5"><div><h2 id="review-title" className="text-xl font-black">Tinjau {reviewing.dataset.nama}</h2><p className="mt-1 text-xs text-slate-500">Bandingkan seluruh observasi sebelum menerbitkan.</p><p className="mt-2 text-xs text-slate-600">Sumber: {reviewing.source.title ?? "Belum dicantumkan"}{reviewing.source.url && <> · <a href={reviewing.source.url} target="_blank" rel="noreferrer" className="font-bold text-indigo-700 underline">Buka sumber resmi</a></>} · pembaruan {tanggal(reviewing.source.updatedAt)}</p>{reviewing.source.note && <p className="mt-1 text-xs text-slate-600">Catatan: {reviewing.source.note}</p>}</div><button className="min-h-11 min-w-11 rounded-lg" onClick={() => setReviewing(null)} aria-label="Tutup"><X className="mx-auto" /></button></div>
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">Status</th><th className="p-3">Periode</th><th className="p-3">Wilayah</th><th className="p-3">Dimensi</th><th className="p-3 text-right">Sebelumnya</th><th className="p-3 text-right">Draf</th><th className="p-3">Satuan</th></tr></thead><tbody>
              {reviewing.observations.map((row) => <tr key={`${row.status}-${row.id}`} className={row.status === "tetap" ? "border-t text-slate-500" : "border-t bg-amber-50/60"}><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === "baru" ? "bg-emerald-100 text-emerald-700" : row.status === "berubah" ? "bg-amber-100 text-amber-800" : row.status === "hilang" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{row.status}</span></td><td className="p-3">{row.periode}</td><td className="p-3">{row.wilayah}<span className="block text-xs text-slate-400">{row.level}</span></td><td className="p-3 text-xs">{Object.entries(row.dimensi).map(([key, value]) => `${key}: ${value}`).join("; ") || "-"}</td><td className="p-3 text-right font-mono">{row.nilaiSebelumnya ?? "-"}</td><td className="p-3 text-right font-mono font-bold">{row.nilai ?? "-"}</td><td className="p-3">{row.satuan ?? "-"}</td></tr>)}
            </tbody></table>
          </div>
          <div className="space-y-3 border-t p-4"><label className="block text-xs font-bold text-slate-700">Catatan peninjauan<textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal" placeholder="Tuliskan pemeriksaan yang dilakukan atau alasan penolakan." /></label><div className="flex flex-wrap justify-between gap-3"><p className="text-xs text-slate-500">{reviewing.observations.length} baris ditinjau. Nilai draf belum dapat dibaca publik maupun SINTA.</p><div className="flex gap-2"><button disabled={working || !data?.isSuperadmin || reviewNote.trim().length < 3} onClick={() => void review(reviewing.version.id, "reject", reviewNote)} className="min-h-11 rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-40">Tolak</button><button disabled={working || !data?.isSuperadmin || reviewNote.trim().length < 3} onClick={() => void review(reviewing.version.id, "publish", reviewNote)} className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Check className="mr-1 inline h-4 w-4" /> Verifikasi & Tayang</button></div></div></div>
        </div>
      </div>}

      {editing && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="edit-dataset-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between"><h2 id="edit-dataset-title" className="text-xl font-black">Atur {editing.nama}</h2><button className="min-h-11 min-w-11 rounded-lg" onClick={() => setEditing(null)} aria-label="Tutup"><X className="mx-auto" /></button></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold">Nama<input value={editing.nama} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
            <label className="text-xs font-bold">Tema<input value={editing.tema} onChange={(e) => setEditing({ ...editing, tema: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
            <label className="text-xs font-bold sm:col-span-2">Definisi indikator<textarea value={editing.definisi ?? ""} onChange={(e) => setEditing({ ...editing, definisi: e.target.value || null })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" rows={3} /></label>
            <label className="text-xs font-bold">Satuan<input value={editing.satuan ?? ""} onChange={(e) => setEditing({ ...editing, satuan: e.target.value || null })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
            <label className="text-xs font-bold">Visual default<select value={editing.defaultView} onChange={(e) => setEditing({ ...editing, defaultView: e.target.value as ApiDataset["defaultView"] })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"><option value="number">Kartu angka</option><option value="line">Garis</option><option value="bar">Batang</option><option value="stacked">Batang bertumpuk</option><option value="composition">Komposisi</option><option value="map">Peta</option></select></label>
            <label className="text-xs font-bold">Judul highlight<input value={editing.highlightTitle ?? ""} onChange={(e) => setEditing({ ...editing, highlightTitle: e.target.value || null })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
            <label className="text-xs font-bold">Urutan highlight<input type="number" value={editing.featuredOrder} onChange={(e) => setEditing({ ...editing, featuredOrder: Number(e.target.value) })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
            <label className="text-xs font-bold sm:col-span-2">Catatan highlight non-angka<textarea value={editing.highlightNote ?? ""} onChange={(e) => setEditing({ ...editing, highlightNote: e.target.value || null })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" rows={2} /></label>
            <label className="text-xs font-bold">Jenis sumber<select disabled={!data?.isSuperadmin} value={editing.sourceType} onChange={(e) => { const sourceType = e.target.value as ApiDataset["sourceType"]; setEditing({ ...editing, sourceType, syncEnabled: sourceType === "manual" ? false : editing.syncEnabled }); }} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"><option value="dynamic">Data dinamis</option><option value="simdasi">SIMDASI</option><option value="manual">Manual</option></select></label>
            <label className="text-xs font-bold">ID variabel/tabel<input disabled={!data?.isSuperadmin} value={editing.sourceRef ?? ""} onChange={(e) => setEditing({ ...editing, sourceRef: e.target.value || null })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
            <label className="text-xs font-bold sm:col-span-2">URL sumber resmi<input disabled={!data?.isSuperadmin} type="url" value={editing.sourceUrl ?? ""} onChange={(e) => setEditing({ ...editing, sourceUrl: e.target.value || null })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
            <label className="text-xs font-bold sm:col-span-2">Konfigurasi sumber JSON<textarea disabled={!data?.isSuperadmin} value={configText} onChange={(e) => setConfigText(e.target.value)} className="mt-1 w-full rounded-lg border p-2 font-mono text-xs font-normal" rows={6} /><span className="mt-1 block font-normal text-slate-500">Dinamis: {`{"th":"ID_TAHUN","wilayahLevel":"kabupaten"}`}. SIMDASI: {`{"wilayah":"1605000","tahun":2026,"wilayahLevel":"kecamatan"}`}.</span></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={editing.isFeatured} onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })} /> Highlight</label><label><input disabled={!data?.isSuperadmin} type="checkbox" checked={editing.syncEnabled} onChange={(e) => setEditing({ ...editing, syncEnabled: e.target.checked })} /> Sinkron aktif</label><label><input disabled={!data?.isSuperadmin} type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Dataset aktif</label></div>
          <div className="mt-6 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm font-bold">Batal</button><button disabled={working} onClick={() => void save()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Simpan</button></div>
        </div>
      </div>}

      {manualDataset && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="manual-import-title" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between gap-4"><div><h2 id="manual-import-title" className="text-xl font-black">Impor Manual {manualDataset.nama}</h2><p className="mt-1 text-xs text-slate-500">Impor selalu membuat draf. Data baru terlihat publik setelah ditinjau dan diterbitkan.</p></div><button className="min-h-11 min-w-11 rounded-lg" onClick={() => setManualDataset(null)} aria-label="Tutup impor manual"><X className="mx-auto" /></button></div>
          <label className="mt-5 block text-xs font-bold">Dokumen JSON<textarea value={manualText} onChange={(event) => setManualText(event.target.value)} rows={20} spellCheck={false} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs font-normal text-slate-100" /></label>
          <p className="mt-2 text-xs leading-5 text-slate-500">Gunakan titik sebagai pemisah desimal. Setiap observasi wajib memuat periode, tahun, kode dan nama wilayah, level wilayah, dimensi, serta nilai. Sumber resmi dan URL wajib dicantumkan.</p>
          <div className="mt-6 flex justify-end gap-2"><button onClick={() => setManualDataset(null)} className="min-h-11 rounded-lg border px-4 py-2 text-sm font-bold">Batal</button><button disabled={working} onClick={() => void importManual()} className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Upload className="mr-1 inline h-4 w-4" /> Simpan sebagai Draf</button></div>
        </div>
      </div>}
    </div>
  );
}
