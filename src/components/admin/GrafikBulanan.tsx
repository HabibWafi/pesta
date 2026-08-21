"use client";

import { useState } from "react";

export interface TitikBulanan {
  bulan: string;
  views: number;
  uniqueVisitors: number;
  perubahanPersen: number | null;
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
 * Menyorot batang tertinggi supaya bulan puncak langsung terlihat tanpa
 * perlu membandingkan angka satu per satu.
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
                  fill="currentColor"
                  className={
                    disorot
                      ? "text-indigo-700 dark:text-indigo-300"
                      : d.views === maks
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-indigo-500/70 dark:text-indigo-500/70"
                  }
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

      {aktif !== null && (
        <p className="text-[11px] text-slate-600 dark:text-slate-300">
          <strong>{labelBulan(data[aktif].bulan)}</strong>
          {" - "}
          {data[aktif].views.toLocaleString("id-ID")} kunjungan,{" "}
          {data[aktif].uniqueVisitors.toLocaleString("id-ID")} pengunjung unik
          {data[aktif].perubahanPersen !== null && (
            <span
              className={
                data[aktif].perubahanPersen! >= 0
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-rose-600 dark:text-rose-400 font-bold"
              }
            >
              {" "}
              ({data[aktif].perubahanPersen! >= 0 ? "+" : ""}
              {data[aktif].perubahanPersen!.toFixed(1)}% dari bulan sebelumnya)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
