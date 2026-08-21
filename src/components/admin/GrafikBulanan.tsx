"use client";

import { useState } from "react";

export interface TitikBulanan {
  bulan: string;
  views: number;
  uniqueVisitors: number;
  adaSimulasi: boolean;
}

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function labelBulan(bulan: string): string {
  const [tahun, bln] = bulan.split("-");
  return `${NAMA_BULAN[Number(bln) - 1]} ${tahun.slice(2)}`;
}

/**
 * Grafik batang kunjungan bulanan.
 *
 * SVG buatan sendiri, bukan library grafik - sesuai pedoman proyek untuk
 * tidak menambah dependency demi hal yang bisa digambar dengan beberapa
 * puluh baris.
 *
 * Batang periode DATA SIMULASI diberi arsir dan warna berbeda. Ini instansi
 * statistik; angka karangan harus bisa dibedakan sekilas dari angka nyata,
 * bukan hanya disebut di keterangan kecil.
 */
export default function GrafikBulanan({ data }: { data: TitikBulanan[] }) {
  const [aktif, setAktif] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
        Belum ada data pada rentang ini.
      </p>
    );
  }

  const L = 44;   // ruang kiri untuk sumbu angka
  const B = 28;   // ruang bawah untuk label bulan
  const T = 8;
  const R = 8;
  const tinggiPlot = 200;
  const lebarBatang = 26;
  const jarak = 10;

  const lebarPlot = data.length * lebarBatang + (data.length - 1) * jarak;
  const lebar = L + lebarPlot + R;
  const tinggi = T + tinggiPlot + B;

  const maks = Math.max(...data.map((d) => d.views), 1);
  // Dibulatkan ke atas supaya garis bantu jadi angka bulat.
  const langkah = Math.pow(10, Math.floor(Math.log10(maks))) / 2 || 1;
  const atas = Math.ceil(maks / langkah) * langkah;

  const garis = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(atas * f));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${lebar} ${tinggi}`}
          width={lebar}
          height={tinggi}
          role="img"
          aria-label={`Grafik kunjungan bulanan, ${data.length} bulan`}
          className="max-w-full"
        >
          <defs>
            {/* Arsir untuk menandai periode data simulasi */}
            <pattern id="arsirSimulasi" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="currentColor" className="text-amber-200 dark:text-amber-900" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="3" className="text-amber-400 dark:text-amber-700" />
            </pattern>
          </defs>

          {/* Garis bantu + angka sumbu */}
          {garis.map((nilai) => {
            const y = T + tinggiPlot - (nilai / atas) * tinggiPlot;
            return (
              <g key={nilai}>
                <line
                  x1={L}
                  y1={y}
                  x2={lebar - R}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-slate-200 dark:text-slate-700"
                />
                <text
                  x={L - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500"
                  style={{ fontSize: 9 }}
                >
                  {nilai.toLocaleString("id-ID")}
                </text>
              </g>
            );
          })}

          {/* Batang */}
          {data.map((d, i) => {
            const x = L + i * (lebarBatang + jarak);
            const h = (d.views / atas) * tinggiPlot;
            const y = T + tinggiPlot - h;
            const disorot = aktif === i;

            return (
              <g
                key={d.bulan}
                onMouseEnter={() => setAktif(i)}
                onMouseLeave={() => setAktif(null)}
              >
                <rect
                  x={x}
                  y={T}
                  width={lebarBatang}
                  height={tinggiPlot}
                  fill="transparent"
                />
                <rect
                  x={x}
                  y={y}
                  width={lebarBatang}
                  height={Math.max(h, 1)}
                  rx="3"
                  fill={d.adaSimulasi ? "url(#arsirSimulasi)" : "currentColor"}
                  className={
                    d.adaSimulasi
                      ? ""
                      : disorot
                        ? "text-indigo-700 dark:text-indigo-400"
                        : "text-indigo-500 dark:text-indigo-500"
                  }
                  opacity={disorot ? 1 : 0.92}
                />
                <text
                  x={x + lebarBatang / 2}
                  y={tinggi - 16}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400"
                  style={{ fontSize: 9 }}
                >
                  {labelBulan(d.bulan)}
                </text>
                {disorot && (
                  <text
                    x={x + lebarBatang / 2}
                    y={y - 5}
                    textAnchor="middle"
                    className="fill-slate-900 dark:fill-white"
                    style={{ fontSize: 10, fontWeight: 700 }}
                  >
                    {d.views.toLocaleString("id-ID")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Keterangan */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500" />
          Data nyata
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm border border-amber-400"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgb(251 191 36) 0 2px, rgb(254 243 199) 2px 5px)",
            }}
          />
          Data simulasi - bukan angka kunjungan sebenarnya
        </span>
      </div>

      {aktif !== null && (
        <p className="text-[11px] text-slate-600 dark:text-slate-300">
          <strong>{labelBulan(data[aktif].bulan)}</strong>
          {" - "}
          {data[aktif].views.toLocaleString("id-ID")} kunjungan,{" "}
          {data[aktif].uniqueVisitors.toLocaleString("id-ID")} pengunjung unik
          {data[aktif].adaSimulasi && (
            <span className="text-amber-700 dark:text-amber-400 font-bold"> (data simulasi)</span>
          )}
        </p>
      )}
    </div>
  );
}
