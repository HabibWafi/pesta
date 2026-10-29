import { ArrowUpRight, ChartNoAxesCombined, Download, ExternalLink, Users } from "lucide-react";
import type { DatasetDetail } from "@/lib/schemas/dashboard-data";

const number = (value: string) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(Number(value));

function Source({ detail }: { detail: DatasetDetail }) {
  return <div className="mt-5 border-t border-[#e2e8f0] pt-4 text-xs leading-5 text-[#64748b]">
    {detail.dataset.sourceUrl && <a href={detail.dataset.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1.5 text-[#0369a1] underline underline-offset-4">Tabel resmi BPS <ExternalLink className="h-3 w-3" /></a>}
    <p>{detail.observations[0]?.catatan}</p>
  </div>;
}

/** Seluruh nilai berasal dari versi terpublikasi di beregam_indikator. */
export default function DashboardOverview({ age, sex }: { age: DatasetDetail | null; sex: DatasetDetail | null }) {
  if (!age && !sex) return null;
  const agePeriod = age?.periods.at(-1)?.kode;
  const ageRows = age?.observations.filter((row) => row.periodeKode === agePeriod) ?? [];
  const ages = [...new Set(ageRows.map((row) => row.dimensi["Kelompok umur"]).filter(Boolean))]
    .sort((a, b) => Number.parseInt(b) - Number.parseInt(a));
  const sexPeriod = sex?.periods.at(-1)?.kode;
  const sexRows = sex?.observations.filter((row) => row.periodeKode === sexPeriod) ?? [];
  const max = Math.max(...ageRows.filter((row) => row.dimensi["Jenis kelamin"] !== "Total").map((row) => Number(row.nilai)), 1);
  const sexTotal = sexRows.reduce((sum, row) => sum + Number(row.nilai), 0);

  return <section aria-labelledby="population-overview">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0369a1]">Kenali Musi Rawas</p><h2 id="population-overview" className="mt-2 text-2xl font-bold">Penduduk dalam satu pandangan</h2></div>
      <a href="#jelajah-data" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#0369a1]">Jelajahi tabel lengkap <ArrowUpRight className="h-4 w-4" /></a>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      {age && <article className="min-w-0 rounded-3xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-bold"><ChartNoAxesCombined className="h-5 w-5 text-[#0369a1]" /> Piramida penduduk</h3><p className="mt-1 text-xs text-[#64748b]">{agePeriod} · {age.dataset.satuan} · Kabupaten Musi Rawas</p></div><a href={`/api/data/datasets/${age.dataset.slug}/csv?period=${agePeriod}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbd5e1] px-3 text-xs font-semibold text-[#475569] hover:border-[#0284c7]"><Download className="h-4 w-4" /> CSV</a></div>
        <div className="mb-4 mt-6 flex justify-center gap-6 text-xs text-[#475569]"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#0284c7]" /> Laki-laki (kiri)</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#7c3aed]" /> Perempuan (kanan)</span></div>
        <div role="img" aria-label={`Piramida penduduk Musi Rawas ${agePeriod}. Nilai setiap kelompok tersedia di tabel rincian di bawah.`} className="space-y-1.5">
          {ages.map((label) => {
            const male = ageRows.find((row) => row.dimensi["Kelompok umur"] === label && row.dimensi["Jenis kelamin"] === "Laki-laki");
            const female = ageRows.find((row) => row.dimensi["Kelompok umur"] === label && row.dimensi["Jenis kelamin"] === "Perempuan");
            return <div key={label} className="grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] items-center gap-2 text-[11px] sm:grid-cols-[minmax(0,1fr)_60px_minmax(0,1fr)]">
              <div className="flex h-5 items-center justify-end gap-1.5"><span className="shrink-0 tabular-nums text-[#075985]">{male ? number(male.nilai) : "—"}</span><div className="h-4 rounded-l bg-[#0284c7]" style={{ width: `${male ? Number(male.nilai) / max * 76 : 0}%` }} /></div>
              <span className="text-center tabular-nums text-[#64748b]">{label}</span>
              <div className="flex h-5 items-center gap-1.5"><div className="h-4 rounded-r bg-[#7c3aed]" style={{ width: `${female ? Number(female.nilai) / max * 76 : 0}%` }} /><span className="shrink-0 tabular-nums text-[#6d28d9]">{female ? number(female.nilai) : "—"}</span></div>
            </div>;
          })}
        </div>
        <details className="mt-5 rounded-xl border border-[#e2e8f0] text-xs text-[#475569]"><summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold">Lihat tabel piramida penduduk</summary><div className="overflow-x-auto px-4 pb-4"><table className="w-full text-left"><caption className="sr-only">Penduduk menurut umur dan jenis kelamin, {agePeriod}, {age.dataset.satuan}</caption><thead><tr><th className="py-2">Umur</th><th className="text-right">Laki-laki</th><th className="text-right">Perempuan</th></tr></thead><tbody>{ages.map((label) => <tr key={label} className="border-t border-[#e2e8f0]"><th className="py-2 font-normal">{label}</th>{["Laki-laki", "Perempuan"].map((gender) => { const row = ageRows.find((item) => item.dimensi["Kelompok umur"] === label && item.dimensi["Jenis kelamin"] === gender); return <td key={gender} className="text-right tabular-nums">{row ? number(row.nilai) : "—"}</td>; })}</tr>)}</tbody></table></div></details>
        <Source detail={age} />
      </article>}
      <div className="space-y-5">
        {sex && <article className="rounded-3xl border border-[#e2e8f0] bg-gradient-to-br from-[#ffffff] to-[#f5f3ff] p-6 sm:p-7"><Users className="mb-4 h-7 w-7 text-[#6d28d9]" /><h3 className="text-lg font-bold">Penduduk menurut jenis kelamin</h3><p className="mt-1 text-xs text-[#64748b]">{sexPeriod} · {sex.dataset.satuan}</p>
          <div className="mt-7 flex h-4 overflow-hidden rounded-full" aria-hidden="true">{sexRows.map((row, index) => <div key={row.id} className={index === 0 ? "bg-[#0284c7]" : "bg-[#7c3aed]"} style={{ width: `${sexTotal > 0 ? Number(row.nilai) / sexTotal * 100 : 0}%` }} />)}</div>
          <dl className="mt-5 grid grid-cols-2 gap-4">{sexRows.map((row, index) => <div key={row.id}><dt className="text-xs text-[#64748b]">{row.dimensi["Jenis kelamin"]}</dt><dd className={`mt-1 text-3xl font-bold tabular-nums ${index === 0 ? "text-[#0369a1]" : "text-[#6d28d9]"}`}>{number(row.nilai)}</dd></div>)}</dl><Source detail={sex} />
        </article>}
        <article className="rounded-3xl border border-[#bae6fd] bg-[#f0f9ff] p-6"><p className="text-xs font-bold uppercase tracking-wider text-[#0369a1]">Panduan membaca</p><h3 className="mt-3 text-lg font-bold">Perhatikan tahun dan satuannya</h3><p className="mt-3 text-sm leading-6 text-[#64748b]">Setiap indikator memiliki periode sendiri. Pilih indikator untuk melihat definisi, rincian data, dan sumbernya. Angka proyeksi penduduk mengikuti pembulatan pada tabel BPS.</p><a href="#jelajah-data" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#0369a1]">Buka penjelajah data <ArrowUpRight className="h-4 w-4" /></a></article>
      </div>
    </div>
  </section>;
}
