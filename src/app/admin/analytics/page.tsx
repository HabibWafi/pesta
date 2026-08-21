"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  Eye,
  CalendarRange,
  Download,
  AlertTriangle,
  Monitor,
  Globe,
  FileText,
} from "lucide-react";
import GrafikBulanan, { type TitikBulanan } from "@/components/admin/GrafikBulanan";

interface Data {
  rentang: { dari: string; sampai: string };
  ringkasan: {
    totalViews: number;
    totalUnik: number;
    hariSimulasi: number;
    hariNyata: number;
    viewsNyata: number;
    rataPerHari: number;
  };
  bulanan: TitikBulanan[];
  halaman: { path: string; views: number; unik: number }[];
  perangkat: { nama: string; jumlah: number }[];
  browser: { nama: string; jumlah: number }[];
}

const angka = (n: number) => n.toLocaleString("id-ID");

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [dari, setDari] = useState("2025-01-01");
  const [sampai, setSampai] = useState(new Date().toISOString().slice(0, 10));

  const ambil = useCallback(
    async (d: string, s: string, batal?: () => boolean) => {
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
    },
    []
  );

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

  const kartu = [
    { label: "Total Kunjungan", nilai: angka(ringkasan.totalViews), icon: Eye, warna: "indigo" },
    { label: "Pengunjung Unik", nilai: angka(ringkasan.totalUnik), icon: Users, warna: "cyan" },
    { label: "Rata-rata per Hari", nilai: angka(ringkasan.rataPerHari), icon: BarChart3, warna: "emerald" },
    { label: "Hari Data Nyata", nilai: `${angka(ringkasan.hariNyata)} hari`, icon: CalendarRange, warna: "amber" },
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

      {/* Peringatan data simulasi */}
      {ringkasan.hariSimulasi > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold mb-1">
              {angka(ringkasan.hariSimulasi)} dari {angka(ringkasan.hariSimulasi + ringkasan.hariNyata)} hari
              pada rentang ini adalah DATA SIMULASI.
            </p>
            <p>
              Angka simulasi dibuat untuk mengisi riwayat sebelum pencatatan nyata dimulai, dan
              <strong> bukan jumlah kunjungan yang sebenarnya</strong>. Jangan memakainya dalam
              laporan resmi. Data nyata sejauh ini: <strong>{angka(ringkasan.viewsNyata)} kunjungan</strong> dalam{" "}
              {angka(ringkasan.hariNyata)} hari.
            </p>
            <p className="mt-1.5 text-[11px] opacity-90">
              Buang seluruh data simulasi dengan menjalankan:{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono">
                npm run db:seed:analitik -- hapus
              </code>
            </p>
          </div>
        </div>
      )}

      {/* Filter rentang */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">Dari tanggal</label>
          <input
            type="date"
            value={dari}
            max={sampai}
            onChange={(e) => setDari(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">Sampai tanggal</label>
          <input
            type="date"
            value={sampai}
            min={dari}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSampai(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
          />
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kartu.map(({ label, nilai, icon: Icon }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
              <Icon className="w-4 h-4" />
              <span className="text-[11px] font-bold">{label}</span>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{nilai}</p>
          </div>
        ))}
      </div>

      {/* Grafik bulanan */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white">Kunjungan per Bulan</h2>
        <GrafikBulanan data={data.bulanan} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Halaman terpopuler */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Halaman Terpopuler
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Hanya dari data nyata (maksimal 90 hari terakhir).
          </p>
          {data.halaman.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
              Belum ada kunjungan yang tercatat.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {data.halaman.map((h) => (
                <li key={h.path} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate">{h.path}</span>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0">
                    {angka(Number(h.views))}
                  </span>
                </li>
              ))}
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
                      <span className="font-bold text-slate-900 dark:text-white">
                        {angka(Number(p.jumlah))} ({persen.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${persen}%` }} />
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
                    <span className="font-bold text-slate-900 dark:text-white">
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
