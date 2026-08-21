"use client";

import Link from "next/link";
import Muncul from "@/components/ui/Muncul";
import { 
  Video, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  Bot, 
  Zap, 
  Lock,
  Database,
  Award,
  FileCheck2,
  LayoutDashboard,
  Home as HomeIcon,
  Layers,
  ArrowRight
} from "lucide-react";

interface HeroSectionProps {
  onOpenVidcon: () => void;
  onOpenPengaduan: () => void;
}

export default function HeroSection({ onOpenVidcon, onOpenPengaduan }: HeroSectionProps) {
  // 5 distinct services in the grid showcase (removed the 3 hero CTAs: ViDCon, Pengaduan, Sinta AI)
  const serviceItems = [
    { 
      name: "SILASTIK BPS", 
      desc: "Data Mikro & Wilkerstat",
      icon: Database, 
      bgColor: "bg-blue-50 text-blue-600 border-blue-200/60",
      href: "#layanan-khusus",
      isInternal: false
    },
    { 
      name: "ROMANTIK", 
      desc: "Rekomendasi Statistik",
      icon: Award, 
      bgColor: "bg-indigo-50 text-indigo-600 border-indigo-200/60",
      href: "#layanan-khusus",
      isInternal: false
    },
    { 
      name: "SKD 2025", 
      desc: "Survei Kebutuhan Data",
      icon: FileCheck2, 
      bgColor: "bg-cyan-50 text-cyan-600 border-cyan-200/60",
      href: "#layanan-khusus",
      isInternal: false
    },
    { 
      name: "Dashboard Data", 
      desc: "Visualisasi Strategis",
      icon: LayoutDashboard, 
      bgColor: "bg-emerald-50 text-emerald-600 border-emerald-200/60",
      href: "/dashboard",
      isInternal: true
    },
    { 
      name: "Desa Cantik", 
      desc: "Desa Cinta Statistik",
      icon: HomeIcon, 
      bgColor: "bg-amber-50 text-amber-600 border-amber-200/60",
      href: "#layanan-khusus",
      isInternal: false
    },
  ];

  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-24 overflow-hidden bg-slate-50">
      {/* Dynamic Animated Background Glow Blobs */}
      <div
        aria-hidden
        className="cahaya-denyut glow-blob top-10 left-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-indigo-300 via-sky-300 to-emerald-200 pointer-events-none"
      />
      <div
        aria-hidden
        className="cahaya-apung glow-blob top-40 right-10 w-[350px] h-[350px] bg-cyan-400 pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Top Pill Badge */}
          <Muncul
            pemicu="segera"
            arah="turun"
            duration={0.5}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-indigo-100 shadow-sm backdrop-blur-md text-xs font-semibold text-indigo-700"
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Inovasi Pelayanan Publik Digital BPS Musi Rawas</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-slate-500 font-normal">Versi 2.0</span>
          </Muncul>

          {/* Main Title with Animated Gradient Accent */}
          <Muncul
            as="h1"
            pemicu="segera"
            delay={0.1}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]"
          >
            Konsultasi Data Statistik{" "}
            <span className="gradient-text-bps block sm:inline">
              Mudah, Cepat & Canggih
            </span>
          </Muncul>

          {/* Description */}
          <Muncul
            as="p"
            pemicu="segera"
            delay={0.2}
            className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto"
          >
            Satu portal untuk layanan **Virtual Data Consultation (ViDCon)**, permohonan data statistik resmi, serta sarana pengaduan publik yang bebas biaya (Nol Rupiah).
          </Muncul>

          {/* 3 Harmonious Action Buttons */}
          <Muncul
            pemicu="segera"
            delay={0.3}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 max-w-2xl mx-auto"
          >
            {/* Button 1: ViDCon Online */}
            <button
              onClick={onOpenVidcon}
              className="group relative flex items-center justify-between gap-2.5 px-5 py-4 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-indigo-600 shadow-xl shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 overflow-hidden border border-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center transition-colors">
                  <Video className="w-4 h-4" />
                </div>
                <span className="tracking-tight font-extrabold text-left">Konsultasi ViDCon</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 group-hover:bg-white/20 group-hover:text-white text-[10px] uppercase font-extrabold">
                0 Rp
              </span>
            </button>

            {/* Tombol 2: Form Aduan */}
            <button
              onClick={onOpenPengaduan}
              className="group relative flex items-center justify-between gap-2.5 px-5 py-4 rounded-2xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-md transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="tracking-tight font-extrabold text-left">Form Aduan</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>

            {/* Button 3: Sinta AI Assistant */}
            <Link
              href="/sinta"
              className="group relative flex items-center justify-between gap-2.5 px-5 py-4 rounded-2xl text-xs font-bold text-indigo-950 bg-gradient-to-r from-cyan-300 via-cyan-400 to-indigo-300 hover:from-cyan-200 hover:to-indigo-200 border border-cyan-300/80 shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-950/10 text-indigo-950 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="tracking-tight font-extrabold text-left">Sinta AI Bot</span>
              </div>
              <Sparkles className="w-4 h-4 text-indigo-900 animate-pulse" />
            </Link>
          </Muncul>

          {/* Feature Guarantees Badges */}
          <Muncul
            pemicu="segera"
            delay={0.4}
            className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>100% Layanan Nol Rupiah</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              <span>Respon Cepat Jam Kerja</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-500" />
              <span>Data Resmi BPS RI</span>
            </div>
          </Muncul>
        </div>

        {/* 5 DISTINCT SERVICE SHOWCASE GRID */}
        <Muncul
          pemicu="segera"
          duration={0.7}
          delay={0.5}
          className="mt-14 glass-card p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl relative overflow-hidden"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Integrasi Sistem & Layanan Publik BPS
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih portal statistik khusus yang Anda butuhkan di bawah ini
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              5 Portal Terintegrasi
            </span>
          </div>

          {/* 5 Distinct Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {serviceItems.map((item, idx) => {
              const Icon = item.icon;
              const CardContent = (
                <div className="w-full h-full p-4 rounded-2xl bg-white/90 border border-slate-200/70 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-200 flex flex-col items-center justify-between text-center group cursor-pointer">
                  <div className={`w-11 h-11 rounded-2xl ${item.bgColor} border flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );

              return item.isInternal ? (
                <Link key={idx} href={item.href} className="block">
                  {CardContent}
                </Link>
              ) : (
                <a key={idx} href={item.href} className="block">
                  {CardContent}
                </a>
              );
            })}
          </div>
        </Muncul>
      </div>
    </section>
  );
}
