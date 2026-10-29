"use client";

import Link from "next/link";
import DataChart from "./DataChart";
import styles from "./dashboard.module.css";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, BarChart3, Copy, Download, LineChart, LoaderCircle, Map as MapIcon, RotateCcw, Search, Table2 } from "lucide-react";
import type { DatasetDetail, DatasetRingkas, ObservasiDashboard } from "@/lib/schemas/dashboard-data";

type ApiDetail = DatasetDetail & {
  success: true;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
type GeoPosition = [number, number];
type GeoGeometry = { type: "Polygon" | "MultiPolygon"; coordinates: GeoPosition[][] | GeoPosition[][][] };
type GeoFeature = { type: "Feature"; properties: { kode: string; nama: string; level: string; kodeInduk?: string }; geometry: GeoGeometry };
type GeoCollection = { type: "FeatureCollection"; features: GeoFeature[] };

export interface DashboardInitialSelection {
  slug?: string;
  period?: string;
  areaLevel?: string;
  areaCode?: string;
  dimensions?: Record<string, string>;
  view?: keyof typeof visualLabels;
}

const EMPTY_INITIAL_SELECTION: DashboardInitialSelection = {};

const visualLabels = {
  number: "Angka",
  line: "Garis",
  bar: "Batang",
  stacked: "Bertumpuk",
  composition: "Komposisi",
  map: "Peta",
} as const;

async function fetchDatasetDetail(slug: string): Promise<ApiDetail> {
  const firstResponse = await fetch(`/api/data/datasets/${encodeURIComponent(slug)}?page=1&limit=1000`);
  const first = await firstResponse.json() as ApiDetail | { success: false; message?: string };
  if (!firstResponse.ok || !first.success) {
    throw new Error("message" in first ? first.message : "Gagal memuat dataset");
  }
  if (first.pagination.totalPages <= 1) return first;
  const rest = await Promise.all(Array.from(
    { length: first.pagination.totalPages - 1 },
    (_, index) => fetch(`/api/data/datasets/${encodeURIComponent(slug)}?page=${index + 2}&limit=1000`)
      .then(async (response) => {
        const body = await response.json() as ApiDetail | { success: false; message?: string };
        if (!response.ok || !body.success) throw new Error("message" in body ? body.message : "Gagal memuat halaman data");
        return body.observations;
      })
  ));
  return { ...first, observations: [first.observations, ...rest].flat() };
}

function formatValue(value: string): string {
  const match = value.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return value;
  const [, sign, integer, fraction] = match;
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped}${fraction ? `,${fraction}` : ""}`;
}

function colorFor(value: number, min: number, max: number): string {
  if (!Number.isFinite(value)) return "#e2e8f0";
  const ratio = max === min ? 0.7 : (value - min) / (max - min);
  return `hsl(196 82% ${74 - ratio * 42}%)`;
}

function geometryPositions(geometry: GeoGeometry): GeoPosition[] {
  if (geometry.type === "Polygon") return geometry.coordinates.flat() as GeoPosition[];
  return geometry.coordinates.flat(2) as GeoPosition[];
}

function geometryPath(geometry: GeoGeometry, bounds: { minX: number; minY: number; maxX: number; maxY: number }): string {
  const width = Math.max(bounds.maxX - bounds.minX, 0.000001);
  const height = Math.max(bounds.maxY - bounds.minY, 0.000001);
  const project = ([x, y]: GeoPosition) => [18 + ((x - bounds.minX) / width) * 764, 18 + (1 - (y - bounds.minY) / height) * 424];
  const polygons: GeoPosition[][][] = geometry.type === "Polygon"
    ? [geometry.coordinates as GeoPosition[][]]
    : geometry.coordinates as GeoPosition[][][];
  return polygons
    .flatMap((polygon) => polygon.map((ring) => ring.map(project)))
    .map((ring) => `${ring.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")} Z`)
    .join(" ");
}

function ChoroplethMap({ rows, level, parent, onDrillDown }: { rows: ObservasiDashboard[]; level: "kecamatan" | "desa"; parent: string | null; onDrillDown: (kode: string) => void }) {
  const [geo, setGeo] = useState<GeoCollection | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/data/wilayah/musi-rawas-${level}.geojson`)
      .then((response) => { if (!response.ok) throw new Error("GeoJSON belum tersedia"); return response.json() as Promise<GeoCollection>; })
      .then((value) => { if (active) setGeo(value); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [level]);
  if (failed) return <p className="py-20 text-center text-sm text-[#64748b]">Peta belum diaktifkan karena GeoJSON resmi belum dipasang atau belum lolos validasi kode wilayah.</p>;
  if (!geo) return <p className="flex items-center justify-center gap-2 py-20 text-sm text-[#64748b]"><LoaderCircle className="h-4 w-4 animate-spin" /> Memuat peta…</p>;

  const features = parent && level === "desa" ? geo.features.filter((feature) => feature.properties.kodeInduk === parent) : geo.features;
  const positions = features.flatMap((feature) => geometryPositions(feature.geometry));
  if (!positions.length) return <p className="py-20 text-center text-sm text-[#64748b]">Bentuk wilayah tidak ditemukan.</p>;
  const xs = positions.map(([x]) => x); const ys = positions.map(([, y]) => y);
  const bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  const values = new Map(rows.map((row) => [row.wilayahKode, Number(row.nilai)]));
  const numeric = [...values.values()].filter(Number.isFinite);
  const min = numeric.length ? Math.min(...numeric) : 0; const max = numeric.length ? Math.max(...numeric) : 1;
  return <div><svg viewBox="0 0 800 460" className="min-h-80 w-full" role="img" aria-label={`Peta data tingkat ${level}`}>
    {features.map((feature) => { const value = values.get(feature.properties.kode); const available = value !== undefined && Number.isFinite(value); const interactive = level === "kecamatan"; const activate = () => interactive && onDrillDown(feature.properties.kode); return <path key={feature.properties.kode} d={geometryPath(feature.geometry, bounds)} fill={available ? colorFor(value, min, max) : "#e2e8f0"} stroke="#ffffff" strokeWidth="0.7" role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined} aria-label={interactive ? `${feature.properties.nama}: ${available ? formatValue(String(value)) : "data tidak tersedia"}. Buka rincian desa.` : undefined} className={interactive ? "cursor-pointer transition-opacity hover:opacity-75 focus:outline-none focus:stroke-[#0369a1] focus:stroke-[3]" : ""} onClick={activate} onKeyDown={(event) => { if (interactive && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); activate(); } }}><title>{`${feature.properties.nama}: ${available ? formatValue(String(value)) : "Data tidak tersedia"}`}</title></path>; })}
  </svg><p className="text-center text-xs text-[#64748b]">Wilayah abu-abu: Data tidak tersedia.{level === "kecamatan" ? " Pilih kecamatan untuk membuka desa bila tersedia." : ""}</p></div>;
}

export default function DashboardClient({
  initialDatasets,
  initialSelection = EMPTY_INITIAL_SELECTION,
  initialLoadError = false,
  children,
}: {
  initialDatasets: DatasetRingkas[];
  initialSelection?: DashboardInitialSelection;
  initialLoadError?: boolean;
  children?: ReactNode;
}) {
  const requestedSlug = initialDatasets.some((item) => item.slug === initialSelection.slug)
    ? initialSelection.slug
    : undefined;
  const initialSlug = requestedSlug ?? [...initialDatasets].filter((item) => item.isFeatured && item.latestPeriod).sort((a, b) => a.featuredOrder - b.featuredOrder)[0]?.slug ?? initialDatasets.find((item) => item.latestPeriod)?.slug ?? initialDatasets[0]?.slug ?? "";
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState("Semua tema");
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(initialSlug));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [period, setPeriod] = useState(initialSelection.period ?? "");
  const [level, setLevel] = useState(initialSelection.areaLevel ?? "");
  const [area, setArea] = useState(initialSelection.areaCode ?? "");
  const [dimensions, setDimensions] = useState<Record<string, string>>(initialSelection.dimensions ?? {});
  const [view, setView] = useState<keyof typeof visualLabels>(initialSelection.view ?? "line");
  const [mapParent, setMapParent] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const firstLoad = useRef(true);

  const themes = useMemo(() => ["Semua tema", ...new Set(initialDatasets.map((item) => item.tema))], [initialDatasets]);
  const datasets = useMemo(() => initialDatasets.filter((item) => (theme === "Semua tema" || item.tema === theme) && `${item.nama} ${item.tema}`.toLowerCase().includes(search.toLowerCase())), [initialDatasets, search, theme]);
  const featured = useMemo(() => initialDatasets.filter((item) => item.isFeatured && item.latestValue !== null).sort((a, b) => a.featuredOrder - b.featuredOrder).slice(0, 4), [initialDatasets]);

  useEffect(() => {
    if (!selectedSlug) return;
    let active = true;
    fetchDatasetDetail(selectedSlug)
      .then((body) => {
        if (!active) return;
        setDetail(body);
        if (firstLoad.current && selectedSlug === requestedSlug) {
          setView(initialSelection.view ?? body.dataset.defaultView);
        } else {
          setPeriod(body.dataset.defaultView === "line" ? "" : body.periods.at(-1)?.kode ?? ""); setLevel(""); setArea("");
          setDimensions(Object.fromEntries(Object.entries(body.dimensionOptions).filter(([, options]) => options.includes("Total")).map(([key]) => [key, "Total"])));
          setView(body.dataset.defaultView);
        }
        firstLoad.current = false;
        setMapParent(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setDetail(null);
        setError(reason instanceof Error ? reason.message : "Dataset gagal dimuat.");
        firstLoad.current = false;
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialSelection.view, reloadKey, requestedSlug, selectedSlug]);

  function selectDataset(slug: string) {
    document.getElementById("jelajah-data")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (slug === selectedSlug) return;
    setDetail(null);
    setLoading(true);
    setError(null);
    setSelectedSlug(slug);
  }

  function resetFilters() {
    setPeriod(""); setLevel(""); setArea(""); setDimensions({}); setMapParent(null);
  }

  async function copyViewLink() {
    const params = new URLSearchParams();
    params.set("dataset", selectedSlug);
    if (period) params.set("period", period);
    if (level) params.set("areaLevel", level);
    if (area) params.set("areaCode", area);
    if (view) params.set("view", view);
    for (const [key, value] of Object.entries(dimensions)) if (value) params.set(`dim.${key}`, value);
    const url = `${window.location.origin}/dashboard?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("Tautan tampilan disalin.");
    } catch {
      window.history.replaceState(null, "", url);
      setShareMessage("Tautan tampilan tersedia di bilah alamat.");
    }
    window.setTimeout(() => setShareMessage(""), 3000);
  }

  const rows = useMemo(() => detail?.observations.filter((item) => (!period || item.periodeKode === period) && (!level || item.wilayahLevel === level) && (!area || item.wilayahKode === area) && Object.entries(dimensions).every(([key, value]) => !value || item.dimensi[key] === value)) ?? [], [detail, period, level, area, dimensions]);
  const csvParams = new URLSearchParams(); if (period) csvParams.set("period", period); if (level) csvParams.set("areaLevel", level); if (area) csvParams.set("areaCode", area);
  for (const [key, value] of Object.entries(dimensions)) if (value) csvParams.set(`dim.${key}`, value);
  const selectedLevel = level === "desa" ? "desa" : "kecamatan";

  return <div className={`${styles.root} min-h-screen bg-[#f5f8fc] text-[#0f172a]`}>
    <header className="border-b border-[#e2e8f0] bg-[#ffffff]/95 px-4 py-5 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#475569] hover:text-[#0369a1] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0369a1]"><ArrowLeft className="h-4 w-4" /> Beranda PESTA</Link><span className="rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-3 py-2 text-xs font-bold text-[#047857]">Data resmi yang telah diverifikasi</span></div></header>
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#e2e8f0] bg-gradient-to-br from-[#eff6ff] via-[#ffffff] to-[#ecfeff] p-7 sm:p-10"><div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-[#bae6fd]/40 blur-3xl" aria-hidden="true" /><p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#0369a1]">BPS Kabupaten Musi Rawas · Dashboard Data</p><h1 className="relative max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">Musi Rawas,<br /><span className="text-[#0369a1]">melalui data.</span></h1><p className="relative mt-5 max-w-2xl text-sm leading-7 text-[#475569]">Kenali penduduk dan indikator sosial Musi Rawas melalui visualisasi data resmi BPS. Telusuri angkanya, pahami konteksnya, dan unduh sesuai kebutuhan Anda.</p><div className="relative mt-6 flex flex-wrap gap-3"><a href="#jelajah-data" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0369a1] px-5 text-sm font-bold text-[#ffffff] hover:bg-[#075985]"><BarChart3 className="h-4 w-4" /> Jelajahi data</a><a href="https://musirawaskab.bps.go.id/id/statistics-table?subject=519&sortBy=date%2Ctitle&sortOrder=desc%2Casc" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-[#94a3b8] px-5 text-sm font-semibold text-[#334155] hover:border-[#0284c7]">Tabel statistik BPS ↗</a></div><p className="mt-6 text-xs text-[#64748b]">Kabupaten Musi Rawas · Periode mengikuti masing-masing indikator · Sumber dapat ditelusuri</p></section>
      {featured.length > 0 && <section aria-labelledby="highlight-title"><h2 id="highlight-title" className="mb-4 text-lg font-bold">Sorotan data</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((item) => <button key={item.id} onClick={() => selectDataset(item.slug)} className="min-h-11 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm p-5 text-left transition hover:border-[#0284c7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369a1]"><p className="text-xs font-bold text-[#0369a1]">{item.highlightTitle ?? item.tema}</p><p className="mt-3 text-3xl font-black">{formatValue(item.latestValue!.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ""))}</p><p className="mt-1 text-xs text-[#64748b]">{item.satuan ?? ""} · {item.latestPeriod}</p>{item.highlightNote && <p className="mt-3 text-xs leading-5 text-[#64748b]">{item.highlightNote}</p>}</button>)}</div></section>}
      {children}
      <div id="jelajah-data" className="scroll-mt-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0369a1]">Eksplorasi mandiri</p><h2 className="mt-2 text-2xl font-bold">Jelajahi data lebih dekat</h2><p className="mt-2 text-sm text-[#64748b]">Pilih indikator, sesuaikan filter, lalu unduh tabel yang Anda butuhkan.</p></div>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm p-4 lg:sticky lg:top-4"><label htmlFor="dashboard-search" className="sr-only">Cari indikator</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#64748b]" /><input id="dashboard-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari indikator…" className="min-h-11 w-full rounded-xl border border-[#cbd5e1] bg-[#f5f8fc] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0284c7]" /></div><label htmlFor="dashboard-theme" className="sr-only">Saring tema</label><select id="dashboard-theme" aria-label="Saring tema indikator" value={theme} onChange={(event) => setTheme(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-[#cbd5e1] bg-[#f5f8fc] px-3 py-2.5 text-sm">{themes.map((item) => <option key={item}>{item}</option>)}</select><div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">{datasets.map((item) => <button key={item.id} onClick={() => selectDataset(item.slug)} aria-current={selectedSlug === item.slug ? "true" : undefined} className={`min-h-11 w-full rounded-xl border p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-[#0369a1] ${selectedSlug === item.slug ? "border-[#0284c7] bg-[#e0f2fe]" : "border-[#e2e8f0] bg-[#f5f8fc] hover:border-[#94a3b8]"}`}><span className="block font-semibold">{item.nama}</span><span className="mt-1 block text-xs text-[#64748b]">{item.tema}{!item.latestPeriod ? " · Belum tersedia" : ` · ${item.latestPeriod}`}</span></button>)}{!datasets.length && <p className="py-8 text-center text-sm text-[#64748b]">Indikator tidak ditemukan.</p>}</div></aside>
        <section className="min-w-0 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm p-4 sm:p-6">
          <p className="sr-only" role="status" aria-live="polite">{shareMessage || (loading ? "Memuat data terverifikasi." : detail ? `${rows.length} observasi ditampilkan.` : error ?? "Tidak ada dataset yang ditampilkan.")}</p>
          {loading && <p className="flex items-center justify-center gap-2 py-28 text-[#64748b]"><LoaderCircle className="h-5 w-5 animate-spin" /> Memuat data terverifikasi…</p>}
          {!loading && !detail && <div className="py-28 text-center"><BarChart3 className="mx-auto mb-3 h-10 w-10 text-[#475569]" /><p className="font-semibold">{error ?? (initialLoadError ? "Katalog indikator belum dapat dimuat." : initialDatasets.length ? "Dataset belum dapat ditampilkan." : "Belum ada dataset terpublikasi.")}</p><p className="mt-2 text-sm text-[#64748b]">Nilai tidak diganti dengan perkiraan.</p>{(error || initialLoadError) && <button onClick={() => { if (initialLoadError) { window.location.reload(); return; } setLoading(true); setError(null); setReloadKey((value) => value + 1); }} className="mt-4 min-h-11 rounded-xl border border-[#0284c7] px-4 py-2 text-sm font-bold text-[#0369a1]">Coba lagi</button>}</div>}
          {!loading && detail && <><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0369a1]">{detail.dataset.tema}</p><h2 className="mt-1 text-2xl font-black">{detail.dataset.nama}</h2>{detail.dataset.definisi && <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748b]">{detail.dataset.definisi}</p>}</div><div className="flex flex-wrap gap-2"><button onClick={() => void copyViewLink()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbd5e1] px-3 py-2 text-sm font-semibold hover:border-[#0284c7]"><Copy className="h-4 w-4" /> Salin tautan</button><a href={`/api/data/datasets/${detail.dataset.slug}/csv${csvParams.size ? `?${csvParams}` : ""}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbd5e1] px-3 py-2 text-sm font-semibold hover:border-[#0284c7]"><Download className="h-4 w-4" /> CSV</a></div></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs text-[#64748b]">Periode<select value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-[#f5f8fc] p-2 text-sm text-[#0f172a]"><option value="">Semua periode</option>{detail.periods.map((item) => <option key={item.kode} value={item.kode}>{item.label}</option>)}</select></label><label className="text-xs text-[#64748b]">Level wilayah<select value={level} onChange={(event) => { setLevel(event.target.value); setArea(""); setMapParent(null); }} className="mt-1 block min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-[#f5f8fc] p-2 text-sm text-[#0f172a]"><option value="">Semua level</option>{detail.dataset.levels.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-xs text-[#64748b]">Wilayah<select value={area} onChange={(event) => setArea(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-[#f5f8fc] p-2 text-sm text-[#0f172a]"><option value="">Semua wilayah</option>{detail.areas.filter((item) => !level || item.level === level).map((item) => <option key={`${item.level}-${item.kode}`} value={item.kode}>{item.nama}</option>)}</select></label>{Object.entries(detail.dimensionOptions).map(([key, options]) => <label key={key} className="text-xs text-[#64748b]">{key}<select value={dimensions[key] ?? ""} onChange={(event) => setDimensions((old) => ({ ...old, [key]: event.target.value }))} className="mt-1 block min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-[#f5f8fc] p-2 text-sm text-[#0f172a]"><option value="">Semua</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div>
            <div className="mt-4 flex justify-end"><button onClick={resetFilters} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9]"><RotateCcw className="h-4 w-4" /> Atur ulang filter</button></div>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Jenis visualisasi">{Object.entries(visualLabels).map(([key, label]) => { const Icon = key === "map" ? MapIcon : key === "line" ? LineChart : key === "bar" || key === "number" ? BarChart3 : Table2; const mapUnavailable = key === "map" && !detail.dataset.levels.some((item) => item === "kecamatan" || item === "desa"); return <button key={key} disabled={mapUnavailable} aria-pressed={view === key} title={mapUnavailable ? "Peta memerlukan data tingkat kecamatan atau desa" : undefined} onClick={() => setView(key as keyof typeof visualLabels)} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${view === key ? "bg-[#0369a1] text-[#ffffff]" : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"}`}><Icon className="h-4 w-4" />{label}</button>; })}</div>
            <div className="mt-4 overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#f5f8fc] p-3"><p className="sr-only">Visualisasi {visualLabels[view]} menampilkan {rows.length} observasi. Seluruh nilai yang sama tersedia pada tabel setelah visualisasi.</p>{view === "map" ? <ChoroplethMap key={`${selectedLevel}-${mapParent ?? "semua"}`} rows={rows.filter((row) => row.wilayahLevel === selectedLevel)} level={selectedLevel} parent={mapParent} onDrillDown={(kode) => { if (selectedLevel === "kecamatan" && detail.dataset.levels.includes("desa")) { setMapParent(kode); setLevel("desa"); setArea(""); } else setArea(kode); }} /> : <DataChart rows={rows} type={view} />}</div>
            <div className="mt-6 overflow-x-auto rounded-xl border border-[#e2e8f0]"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Tabel data {detail.dataset.nama}</caption><thead className="bg-[#f1f5f9] text-xs uppercase text-[#475569]"><tr><th className="p-3">Periode</th><th className="p-3">Wilayah</th><th className="p-3">Dimensi</th><th className="p-3 text-right">Nilai</th><th className="p-3">Satuan</th><th className="p-3">Catatan</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[#e2e8f0]"><td className="p-3">{row.periode}</td><td className="p-3">{row.wilayahNama}<span className="block text-xs text-[#64748b]">{row.wilayahLevel}</span></td><td className="p-3 text-xs text-[#64748b]">{Object.entries(row.dimensi).map(([key, value]) => `${key}: ${value}`).join("; ") || "—"}</td><td className="p-3 text-right font-mono font-bold text-[#0369a1]">{formatValue(row.nilai.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ""))}</td><td className="p-3">{row.satuan ?? "—"}</td><td className="p-3 text-xs text-[#64748b]">{row.catatan ?? "—"}</td></tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-sm text-[#64748b]">Data tidak tersedia untuk kombinasi filter ini.</p>}</div>
            <footer className="mt-5 border-t border-[#e2e8f0] pt-4 text-xs leading-5 text-[#64748b]"><p>Sumber: {detail.dataset.sumberPublikasi ?? "Badan Pusat Statistik"}{detail.dataset.sourceUrl && <> · <a className="text-[#0369a1] underline" href={detail.dataset.sourceUrl} target="_blank" rel="noreferrer">Lihat sumber resmi</a></>}</p><p>Pembaruan sumber: {detail.dataset.sourceUpdatedAt ? new Date(detail.dataset.sourceUpdatedAt).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }) : "Tidak dicantumkan"}. Status: data resmi yang telah diverifikasi.</p></footer>
          </>}
        </section>
      </div>
    </main>
  </div>;
}
