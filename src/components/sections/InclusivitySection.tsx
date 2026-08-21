"use client";

import { 
  Accessibility, 
  Ear, 
  Volume2, 
  Eye, 
  HeartHandshake, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  CheckCircle2 
} from "lucide-react";

export default function InclusivitySection() {
  return (
    <section id="inklusi" className="py-20 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span>UU No. 8 Tahun 2016 & Standar WCAG 2.1</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Komitmen Pelayanan Inklusif & Ramah Kelompok Rentan
          </h2>
          <p className="text-sm text-indigo-200 leading-relaxed">
            BPS Kabupaten Musi Rawas memastikan seluruh lapisan masyarakat—termasuk lansia, penyandang tuna rungu, dan pengguna layanan dengan kebutuhan khusus—dapat mengakses data statistik dengan mudah, nyaman, dan bermartabat.
          </p>
        </div>

        {/* 4 Key Innovations Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Innovation 1: Tuna Rungu */}
          <div
            className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between space-y-4 hover:-translate-y-[5px] transition-transform duration-200"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Ear className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Disabilitas Pendengaran (Tuna Rungu)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fasilitas pendampingan <strong>Juru Bahasa Isyarat (JBI)</strong> &amp; fitur Live Text Chat pada sesi Virtual Data Consultation (ViDCon).
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Opsi JBI di Formulir ViDCon</span>
            </div>
          </div>

          {/* Innovation 2: Lansia */}
          <div
            className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between space-y-4 hover:-translate-y-[5px] transition-transform duration-200"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Ramah Lansia (Lanjut Usia)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pendampingan komunikasi khusus secara perlahan dan sabar oleh Petugas PST, dilengkapi opsi pembesar ukuran huruf hingga 130%.
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Pembesar Teks &amp; Font Jelas</span>
            </div>
          </div>

          {/* Innovation 3: Audio Voice Reader */}
          <div
            className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between space-y-4 hover:-translate-y-[5px] transition-transform duration-200"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Volume2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Audio Voice Reader (Tuna Netra)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fitur pembaca teks otomatis berbasis suara manusia (Text-to-Speech) untuk membacakan sapaan dan ringkasan layanan PESTA.
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 text-[11px] text-indigo-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>Dengarkan via Tombol Melayang</span>
            </div>
          </div>

          {/* Innovation 4: High Contrast */}
          <div
            className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between space-y-4 hover:-translate-y-[5px] transition-transform duration-200"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Mode Kontras Tinggi (High Contrast)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Modifikasi warna visual Hitam-Kuning dengan kontras ekstrem untuk membantu pengunjung dengan keterbatasan penglihatan.
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 text-[11px] text-cyan-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Standar Aksesibilitas WCAG</span>
            </div>
          </div>
        </div>

        {/* Guarantee Banner */}
        <div className="mt-12 p-6 rounded-3xl bg-gradient-to-r from-emerald-900/60 to-indigo-900/60 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-base">Jalur Layanan Prioritas (Priority Service)</h4>
              <p className="text-xs text-emerald-200 mt-0.5">
                Setiap permohonan dari kelompok rentan akan langsung diberi tanda prioritas di sistem admin BPS Musi Rawas untuk segera ditindaklanjuti.
              </p>
            </div>
          </div>
          <a
            href="#kontak"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs shadow-lg transition-all shrink-0"
          >
            Hubungi Tim PST Inklusif
          </a>
        </div>
      </div>
    </section>
  );
}
