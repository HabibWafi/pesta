"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  Eye,
  TrendingUp,
  Download,
  Monitor,
  Globe,
  FileText,
  CalendarRange,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import GrafikBulanan, { type TitikBulanan } from "@/components/admin/GrafikBulanan";

interface Data {
  rentang: { dari: string; sampai: string };
  ringkasan: {
    totalViews: number;
    totalUnik: number;
    jumlahHari: number;
    jumlahBulan: number;
    rataPerHari: number;
    puncak: { bulan: string; views: number } | null;
  };
  bulanan: TitikBulanan[];
  halaman: { path: string; views: number; unik: number }[];
  perangkat: { nama: string; jumlah: number }[];
  browser: { nama: string; jumlah: number }[];
}

const angka = (n: number) => Number(n).toLocaleString("id-ID");

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function namaBulanPanjang(bulan: string): string {
  const [tahun, bln] = bulan.split("-");
  return `${NAMA_BULAN[Number(bln) - 1]} ${tahun}`;
}

/** Nama halaman yang lebih ramah daripada path mentahnya. */
function namaHalaman(path: string): string {
  const peta: Record<string, string> = {
    "/": "Beranda",
    "/sinta": "SINTA",
    "/dashboard": "Dashboard Statistik",
  };
  return peta[path] ?? path;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [dari, setDari] = useState("2025-01-01");
  const [sampai, setSampai] = useState(new Date().toISOString().slice(0, 10));

  const ambil = useCallback(async (d: string, s: string, batal?: () => boolean) => {
    try {
      const res = await fetch(`/api/admin/analytics?dari=${d}&sampai=${s}`);
      const json = await res.json();
      if (batal?.()) return;
      if (!json.success) throw new Error(json.message);
      setData(json);
    } catch (err) {
      if (batal?.()) return;
      toast.error("Gagal memuat statistik", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      if (!batal?.()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let dilepas = false;
    void ambil(dari, sampai, () => dilepas);
    return () => {
      dilepas = true;
    };
  }, [ambil, dari, sampai]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        Memuat statistik pengunjung...
      </div>
    );
  }

  if (!data) return null;

  const { ringkasan } = data;
  const totalPerangkat = data.perangkat.reduce((n, p) => n + Number(p.jumlah), 0);
  const totalHalaman = data.halaman.reduce((n, h) => n + Number(h.views), 0);
  const bulananTerbaru = [...data.bulanan].reverse();

  const kartu = [
    { label: "Total Kunjungan", nilai: angka(ringkasan.totalViews), icon: Eye },
    { label: "Pengunjung Unik", nilai: angka(ringkasan.totalUnik), icon: Users },
    { label: "Rata-rata per Hari", nilai: angka(ringkasan.rataPerHari), icon: BarChart3 },
    {
      label: "Bulan Tertinggi",
      nilai: ringkasan.puncak ? namaBulanPanjang(ringkasan.puncak.bulan).split(" ")[0] : "-",
      sub: ringkasan.puncak ? `${angka(ringkasan.puncak.views)} kunjungan` : undefined,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Statistik Pengunjung
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dihitung sendiri di server BPS. Alamat IP pengunjung tidak pernah disimpan.
          </p>
        </div>

        <a
          href={`/api/admin/analytics/csv?dari=${dari}&sampai=${sampai}`}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20"
        >
          <Download className="w-4 h-4" /> Ekspor CSV
        </a>
      </div>

      {/* Filter rentang */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
            Dari tanggal
          </label>
          <input
            type="date"
            value={dari}
            max={sampai}
            onChange={(e) => setDari(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
            Sampai tanggal
          </label>
          <input
            type="date"
            value={sampai}
            min={dari}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSampai(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
          />
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 pb-2 flex items-center gap-1.5">
          <CalendarRange className="w-3.5 h-3.5" />
          {angka(ringkasan.jumlahHari)} hari &middot; {ringkasan.jumlahBulan} bulan
        </p>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kartu.map(({ label, nilai, sub, icon: Icon }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
              <Icon className="w-4 h-4" />
              <span className="text-[11px] font-bold">{label}</span>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{nilai}</p>
            {sub && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Grafik bulanan */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white">Kunjungan per Bulan</h2>
        <GrafikBulanan data={data.bulanan} />
      </div>

      {/* Tabel monitoring bulanan */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">Monitoring Bulanan</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Urut dari bulan terbaru. Perubahan dihitung terhadap bulan sebelumnya.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800">
              <tr className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <th className="p-3">Bulan</th>
                <th className="p-3 text-right">Kunjungan</th>
                <th className="p-3 text-right">Pengunjung Unik</th>
                <th className="p-3 text-right">Rata-rata/Hari</th>
                <th className="p-3 text-right">Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bulananTerbaru.map((b) => {
                const hariDalamBulan = new Date(
                  Number(b.bulan.slice(0, 4)),
                  Number(b.bulan.slice(5, 7)),
                  0
                ).getDate();
                const naik = (b.perubahanPersen ?? 0) >= 0;
                return (
                  <tr
                    key={b.bulan}
                    className="text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {namaBulanPanjang(b.bulan)}
                    </td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                      {angka(b.views)}
                    </td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                      {angka(b.uniqueVisitors)}
                    </td>
                    <td className="p-3 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                      {angka(Math.round(b.views / hariDalamBulan))}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {b.perubahanPersen === null ? (
                        <span className="text-slate-400 dark:text-slate-500 inline-flex items-center gap-1">
                          <Minus className="w-3 h-3" />
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            naik
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {naik ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {Math.abs(b.perubahanPersen).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Halaman terpopuler */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Halaman Terpopuler
          </h2>
          {data.halaman.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
              Belum ada kunjungan yang tercatat.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {data.halaman.map((h) => {
                const persen = totalHalaman ? (Number(h.views) / totalHalaman) * 100 : 0;
                return (
                  <li key={h.path} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        <span className="font-semibold">{namaHalaman(h.path)}</span>
                        <span className="text-slate-400 dark:text-slate-500 font-mono ml-1.5 text-[10px]">
                          {h.path}
                        </span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0 tabular-nums">
                        {angka(h.views)}
                        <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
                          ({persen.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${persen}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Perangkat & peramban */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="space-y-2">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Perangkat
            </h2>
            {data.perangkat.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada data.</p>
            ) : (
              data.perangkat.map((p) => {
                const persen = totalPerangkat ? (Number(p.jumlah) / totalPerangkat) * 100 : 0;
                return (
                  <div key={p.nama} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="capitalize text-slate-700 dark:text-slate-300">{p.nama}</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {angka(Number(p.jumlah))} ({persen.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${persen}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Peramban
            </h2>
            {data.browser.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada data.</p>
            ) : (
              <ul className="space-y-1">
                {data.browser.map((b) => (
                  <li key={b.nama} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 dark:text-slate-300">{b.nama}</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {angka(Number(b.jumlah))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
