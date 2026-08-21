"use client";

import Link from "next/link";
import { 
  BarChart3, 
  ArrowLeft, 
  Clock, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  PieChart,
  Sparkles,
  LayoutDashboard
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const metrics = [
    { label: "Pertumbuhan Ekonomi (PDRB)", val: "5.42%", change: "+0.3%", icon: TrendingUp, color: "text-emerald-400 bg-emerald-500/10" },
    { label: "Indeks Pembangunan Manusia", val: "71.25", change: "Kategori Tinggi", icon: Activity, color: "text-indigo-400 bg-indigo-500/10" },
    { label: "Tingkat Inflasi Daerah", val: "2.15%", change: "Stabil (YoY)", icon: DollarSign, color: "text-cyan-400 bg-cyan-500/10" },
    { label: "Jumlah Penduduk Musi Rawas", val: "418.520", change: "Jiwa", icon: Users, color: "text-amber-400 bg-amber-500/10" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col p-4 sm:p-8 relative overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-4 relative z-10 border-b border-slate-800 pb-6 mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda PESTA
        </Link>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
          <Clock className="w-4 h-4" />
          Dalam Masa Pengembangan
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full relative z-10 space-y-10 flex-grow">
        {/* Title Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-xl shadow-indigo-500/30 mx-auto">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <LayoutDashboard className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Dashboard Data Strategis Musi Rawas
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Visualisasi data makro ekonomi, sosial, kependudukan, dan indikator pembangunan daerah Musi Rawas secara interaktif & real-time.
          </p>
        </div>

        {/* Mock Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="p-6 rounded-3xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400">2025/2026</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                  <p className="text-2xl font-black text-white mt-1">{item.val}</p>
                  <p className="text-[11px] font-bold text-emerald-400 mt-1">{item.change}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Visual Chart Placeholder */}
        <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-md text-center space-y-6 relative overflow-hidden">
          <div className="max-w-md mx-auto space-y-3">
            <PieChart className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
            <h3 className="text-xl font-bold text-white">Visualisasi Grafik Interactive Coming Soon</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tim pengembang BPS Musi Rawas sedang menyiapkan grafik PDRB interaktif, peta tematik per kecamatan, dan tren inflasi historis.
            </p>
          </div>

          {/* Chart Skeleton Preview */}
          <div className="h-44 w-full bg-slate-900/80 rounded-2xl border border-slate-800 flex items-end justify-between p-6 gap-2">
            {[40, 65, 45, 80, 55, 90, 70, 95, 85, 100].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-t-lg opacity-60 hover:opacity-100 transition-opacity"
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center py-6 text-xs text-slate-500 border-t border-slate-800 mt-12">
        <p>© {new Date().getFullYear()} BPS Kabupaten Musi Rawas. Dashboard Data Publik.</p>
      </footer>
    </div>
  );
}
