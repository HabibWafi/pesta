import type { ObservasiDashboard } from "@/lib/schemas/dashboard-data";

type View = "number" | "line" | "bar" | "stacked" | "composition" | "map";
const format = (value: string | number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(Number(value));
const colors = ["#0284c7", "#7c3aed", "#059669", "#b45309", "#e11d48", "#2563eb"];
const label = (row: ObservasiDashboard) => [row.periode, row.wilayahNama, ...Object.values(row.dimensi)].join(" · ");

export default function DataChart({ rows, type }: { rows: ObservasiDashboard[]; type: View }) {
  const numeric = rows.filter((row) => row.nilai.trim() !== "" && Number.isFinite(Number(row.nilai)));
  if (!numeric.length) return <p className="py-20 text-center text-sm text-[#64748b]">Tidak ada nilai numerik untuk divisualisasikan.</p>;
  const periods = new Set(numeric.map((row) => row.periodeKode));
  const areas = new Set(numeric.map((row) => row.wilayahKode));
  const dimensions = [...new Set(numeric.flatMap((row) => Object.keys(row.dimensi)))];
  const varying = dimensions.filter((key) => new Set(numeric.map((row) => row.dimensi[key])).size > 1);
  const totalMixed = varying.some((key) => numeric.some((row) => /^(total|jumlah|jumlah\/total|laki-laki \+ perempuan)$/i.test(row.dimensi[key] ?? "")));
  const categoricalLabel = (row: ObservasiDashboard) => [
    ...(periods.size > 1 ? [row.periode] : []),
    ...(areas.size > 1 ? [row.wilayahNama] : []),
    ...varying.map((key) => row.dimensi[key]),
  ].join(" · ") || row.periode;
  const explanation = (text: string) => <p className="px-4 py-16 text-center text-sm leading-6 text-[#64748b]">{text}</p>;

  if (type === "number") return <div className="grid gap-4 py-8 sm:grid-cols-2">{numeric.map((row) => <div key={row.id} className={`rounded-2xl border border-[#bae6fd] bg-[#f0f9ff] p-6 text-center ${numeric.length === 1 ? "sm:col-span-2" : ""}`}><p className="break-words text-4xl font-black tabular-nums text-[#0369a1] sm:text-5xl">{format(row.nilai)}</p><p className="mt-3 text-sm text-[#475569]">{row.satuan} · {categoricalLabel(row)}</p><p className="mt-1 text-xs text-[#64748b]">{row.wilayahNama}</p></div>)}</div>;

  if (type === "composition" || type === "stacked") {
    if (periods.size !== 1 || areas.size !== 1 || varying.length !== 1 || totalMixed || numeric.some((row) => Number(row.nilai) < 0)) {
      return explanation("Komposisi memerlukan satu periode, satu wilayah, dan satu kategori pembeda. Pilih rinciannya tanpa mencampurkan baris Total, atau gunakan grafik batang untuk membandingkan nilai.");
    }
    const total = numeric.reduce((sum, row) => sum + Number(row.nilai), 0);
    if (total <= 0) return explanation("Jumlah nilai harus lebih besar dari nol untuk menampilkan komposisi.");
    let offset = 0;
    return <div className="flex flex-col items-center gap-6 py-8">
      {type === "composition" ? <svg viewBox="0 0 240 240" className="h-56 w-56" role="img" aria-label="Komposisi kategori pada periode dan wilayah terpilih"><title>{`Komposisi ${numeric[0].periode} · ${numeric[0].wilayahNama}`}</title>{numeric.map((row, index) => { const length = Number(row.nilai) / total * 565.49; const start = offset; offset += length; return <circle key={row.id} cx="120" cy="120" r="90" fill="none" stroke={colors[index % colors.length]} strokeWidth="32" strokeDasharray={`${length} ${565.49 - length}`} strokeDashoffset={-start} transform="rotate(-90 120 120)"><title>{`${categoricalLabel(row)}: ${format(row.nilai)} ${row.satuan}`}</title></circle>; })}</svg>
        : <div className="flex h-14 w-full overflow-hidden rounded-xl" role="img" aria-label="Komposisi kategori dalam batang bertumpuk">{numeric.map((row, index) => <div key={row.id} title={`${categoricalLabel(row)}: ${format(row.nilai)} ${row.satuan}`} style={{ width: `${Number(row.nilai) / total * 100}%`, backgroundColor: colors[index % colors.length] }} />)}</div>}
      <ul className="grid gap-3 text-xs text-[#475569] sm:grid-cols-2">{numeric.map((row, index) => <li key={row.id} className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />{categoricalLabel(row)}: <strong className="tabular-nums">{format(row.nilai)} {row.satuan}</strong></li>)}</ul>
      <p className="max-w-lg text-center text-xs leading-5 text-[#64748b]">Ukuran bagian dihitung dari jumlah rincian terpilih. Pembulatan pada sumber dapat menyebabkan perbedaan terhadap total resmi.</p>
    </div>;
  }

  if (type === "line") {
    if (periods.size < 2) return explanation("Grafik tren memerlukan lebih dari satu periode. Data ini dapat dilihat sebagai angka atau grafik batang.");
    if (periods.size !== numeric.length) return explanation("Pilih satu wilayah dan satu kategori untuk membaca tren antarperiode, atau gunakan grafik batang untuk membandingkan rincian.");
    const sorted = [...numeric].sort((a, b) => a.tahun - b.tahun || a.periodeKode.localeCompare(b.periodeKode));
    const min = Math.min(0, ...sorted.map((row) => Number(row.nilai)));
    const max = Math.max(0, ...sorted.map((row) => Number(row.nilai)));
    const span = max - min || 1;
    const point = (row: ObservasiDashboard, index: number) => ({ x: 100 + index / (sorted.length - 1) * 640, y: 255 - (Number(row.nilai) - min) / span * 205 });
    return <svg viewBox="0 0 800 320" className="min-h-64 w-full" role="img" aria-label="Tren nilai antarperiode; rincian tersedia dalam tabel"><title>{`Tren ${sorted[0].wilayahNama}, ${sorted[0].satuan}`}</title>
      {[0, 1, 2, 3, 4].map((tick) => { const y = 50 + tick * 205 / 4; return <g key={tick}><line x1="95" y1={y} x2="750" y2={y} stroke="#e2e8f0" strokeDasharray="4 5" /><text x="82" y={y + 4} fill="#64748b" fontSize="12" textAnchor="end">{format(max - tick * span / 4)}</text></g>; })}
      <polyline fill="none" stroke="#0284c7" strokeWidth="3" points={sorted.map((row, index) => { const p = point(row, index); return `${p.x},${p.y}`; }).join(" ")} />
      {sorted.map((row, index) => { const p = point(row, index); return <g key={row.id}><circle cx={p.x} cy={p.y} r="5" fill="#0369a1"><title>{`${label(row)}: ${format(row.nilai)} ${row.satuan}`}</title></circle><text x={p.x} y={p.y - 13} fill="#075985" fontSize="12" textAnchor="middle">{format(row.nilai)}</text><text x={p.x} y="287" fill="#64748b" fontSize="12" textAnchor="middle">{row.periode}</text></g>; })}
    </svg>;
  }

  const min = Math.min(0, ...numeric.map((row) => Number(row.nilai)));
  const max = Math.max(0, ...numeric.map((row) => Number(row.nilai)));
  const span = max - min || 1;
  const zero = -min / span * 100;
  return <div className="space-y-4 px-1 py-5 sm:px-3" role="img" aria-label="Perbandingan nilai dalam grafik batang; seluruh rincian tersedia dalam tabel">
    <p className="mb-5 text-xs text-[#64748b]">{periods.size === 1 ? `${numeric[0].periode} · ` : ""}{numeric[0].satuan}</p>
    {numeric.map((row, index) => { const value = Number(row.nilai); const start = Math.min(zero, (value - min) / span * 100); return <div key={row.id} title={`${label(row)}: ${format(row.nilai)} ${row.satuan}`}><div className="mb-1.5 flex items-start justify-between gap-3 text-xs"><span className="text-[#475569]">{categoricalLabel(row)}</span><strong className="shrink-0 tabular-nums text-[#075985]">{format(row.nilai)}</strong></div><div className="relative h-3 rounded bg-[#f1f5f9]"><div className="absolute h-full rounded" style={{ left: `${start}%`, width: `${Math.abs(value) / span * 100}%`, backgroundColor: colors[index % colors.length] }} /></div></div>; })}
  </div>;
}

export { DataChart };
