"use client";

import Muncul from "@/components/ui/Muncul";
import { 
  Video, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  CalendarCheck, 
  MessageSquareCheck, 
  Sparkles, 
  ArrowRight,
  Building2,
  GraduationCap,
  Briefcase,
  UserCheck,
  ChevronRight
} from "lucide-react";

interface VidconSectionProps {
  onOpenVidcon: () => void;
}

export default function VidconSection({ onOpenVidcon }: VidconSectionProps) {
  const steps = [
    {
      step: "01",
      title: "Pengajuan Jadwal Online",
      desc: "Isi formulir pendaftaran ViDCon dengan memilih tanggal, waktu, dan topik konsultasi yang Anda butuhkan.",
      icon: CalendarCheck,
      color: "from-indigo-500 to-indigo-600",
      accent: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    },
    {
      step: "02",
      title: "Verifikasi Petugas BPS",
      desc: "Tim BPS Musi Rawas memverifikasi permohonan dan mengirimkan tautan Google Meet/Zoom via WhatsApp / Email dalam 1x24 jam.",
      icon: MessageSquareCheck,
      color: "from-cyan-500 to-blue-600",
      accent: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    },
    {
      step: "03",
      title: "Sesi Konsultasi Virtual",
      desc: "Diskusi tatap muka online bersama staf teknis dan ahli statistik BPS sesuai jadwal (Senin-Jumat, 08.00-15.00 WIB).",
      icon: Video,
      color: "from-emerald-500 to-teal-600",
      accent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      step: "04",
      title: "Rekomendasi & Hasil Data",
      desc: "Dapatkan penjelasan konsep, rujukan publikasi, notulensi konsultasi, atau surat rekomendasi statistik secara gratis.",
      icon: CheckCircle2,
      color: "from-amber-500 to-orange-600",
      accent: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
  ];

  const targetAudience = [
    { label: "OPD & Instansi Pemerintah", icon: Building2, desc: "Penyusunan data indikator makro PDRB, inflasi, & perencanaan daerah" },
    { label: "Akademisi & Mahasiswa", icon: GraduationCap, desc: "Bimbingan riset, skripsi, & validasi sampel metodologi penelitian" },
    { label: "Peneliti & Lembaga Riset", icon: Briefcase, desc: "Akses data sektoral, penjelasan konsep & definisi variabel statistik" },
    { label: "Masyarakat Umum & Media", icon: UserCheck, desc: "Informasi rilis statistik resmi, kependudukan, & sosial ekonomi" },
  ];

  const topics = [
    "Data Sosial, Kependudukan, IPM & Kemiskinan",
    "Data Perekonomian, PDRB, Inflasi & Pertanian",
    "Metodologi Sensus, Survei & Penarikan Sampel",
    "Konsep, Definisi & Standar Data Statistik",
    "Rekomendasi Kegiatan Statistik Sektoral (ROMANTIK)",
    "Bimbingan Tugas Akhir / Skripsi Mahasiswa",
  ];

  return (
    <section id="vidcon" className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Glow Background Effects */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Muncul
            arah="skala"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-4 shadow-inner"
          >
            <Video className="w-4 h-4 text-cyan-400" />
            Layanan Virtual Consultation Resmi
          </Muncul>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            ViDCon (Virtual Data Consultation)
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Inovasi pelayanan konsultasi statistik tatap muka virtual tanpa harus datang langsung ke kantor BPS Musi Rawas. Bebas biaya (100% Gratis).
          </p>
        </div>

        {/* Workflow Steps (Cleaned Header & Dynamic Animations) */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              Alur Layanan ViDCon
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              4 Langkah Mudah Konsultasi Statistik Virtual BPS Musi Rawas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <Muncul
                  key={index}
                  delay={index * 0.15}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-xl flex flex-col justify-between group hover:border-cyan-500/50 hover:shadow-cyan-500/10 hover:-translate-y-[8px] transition-all duration-300"
                >
                  {/* Decorative Corner Glow */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none" />

                  <div>
                    {/* Badge & Icon Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-black text-slate-600 group-hover:text-cyan-400 transition-colors">
                        {item.step}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  {/* Animated Arrow Connecting Step Indicator for Desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center">
                      <div
                        aria-hidden
                        className="panah-dorong w-7 h-7 rounded-full bg-slate-800 border border-cyan-500/50 text-cyan-400 flex items-center justify-center shadow-lg backdrop-blur-md"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </Muncul>
              );
            })}
          </div>
        </div>

        {/* Grid 2 Columns: Target Audience & Covered Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Target Audience */}
          <Muncul
            arah="kiri"
            className="bg-slate-800/60 rounded-3xl p-8 border border-slate-700/60 backdrop-blur-md space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Siapa Saja Yang Boleh Mengakses?</h3>
                <p className="text-xs text-slate-400">Layanan ViDCon terbuka untuk semua pihak</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {targetAudience.map((target, idx) => {
                const TargetIcon = target.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5 hover:border-indigo-500/40 hover:scale-[1.02] transition-all"
                  >
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                      <TargetIcon className="w-4 h-4 shrink-0" />
                      <span>{target.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {target.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </Muncul>

          {/* Topics Covered */}
          <Muncul
            arah="kanan"
            className="bg-slate-800/60 rounded-3xl p-8 border border-slate-700/60 backdrop-blur-md space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Cakupan Topik Yang Bisa Dibahas</h3>
                <p className="text-xs text-slate-400">Materi konsultasi statistik komprehensif</p>
              </div>
            </div>

            <div className="space-y-3">
              {topics.map((topic, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 hover:border-cyan-500/40 hover:translate-x-1 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{topic}</span>
                </div>
              ))}
            </div>
          </Muncul>
        </div>

        {/* Bottom Call to Action Card */}
        <Muncul
          className="mt-16 text-center bg-gradient-to-r from-indigo-900 via-slate-800 to-cyan-950 p-8 sm:p-10 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden"
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Siap Berkonsultasi Dengan Ahli Statistik BPS?
            </h3>
            <p className="text-sm text-slate-300">
              Pilih jadwal hari kerja (Senin - Jumat, 08.00 - 15.00 WIB) dan ajukan permohonan konsultasi online gratis sekarang.
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenVidcon}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 hover:from-indigo-400 hover:to-emerald-300 text-slate-950 font-black text-sm shadow-xl transition-all hover:scale-105"
              >
                <Video className="w-5 h-5 fill-slate-950" />
                <span>Form Pendaftaran ViDCon Online</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Muncul>
      </div>
    </section>
  );
}
