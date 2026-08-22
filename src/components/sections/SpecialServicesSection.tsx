"use client";

import {
  Award,
  FileCheck2,
  Map,
  Home,
  ExternalLink,
  Layers,
  CheckCircle2,
  Library,
  FlaskConical,
  Code2,
  Building2,
  ArrowRight,
} from "lucide-react";

/**
 * Layanan nasional BPS RI.
 *
 * Ditandai terpisah dari layanan Musi Rawas di atasnya - keempatnya memang
 * dikelola PST BPS Pusat, bukan kantor kabupaten. Menaruhnya dalam satu
 * kelompok yang sama akan membuat pengunjung mengira bisa menanyakannya ke
 * petugas Musi Rawas.
 */
const LAYANAN_NASIONAL = [
  {
    nama: "Perpustakaan Digital BPS",
    keterangan:
      "Katalog daring seluruh publikasi dan koleksi statistik BPS - dapat ditelusuri dan diunduh gratis.",
    tautan: "https://perpustakaan.bps.go.id/opac/",
    labelTautan: "Buka Katalog Perpustakaan",
    Ikon: Library,
    warna: "rose",
  },
  {
    nama: "StatInaLab",
    keterangan:
      "Statistics Indonesia Data Lab - pemrosesan data mikro secara langsung dan di tempat, untuk kebutuhan data yang tidak terpenuhi publikasi biasa.",
    tautan: "https://statinalab.bps.go.id/",
    labelTautan: "Pelajari StatInaLab",
    Ikon: FlaskConical,
    warna: "violet",
  },
  {
    nama: "Web API BPS",
    keterangan:
      "Antarmuka pemrograman resmi bagi pengembang untuk mengambil data statistik BPS langsung ke aplikasi sendiri.",
    tautan: "https://webapi.bps.go.id/developer/",
    labelTautan: "Portal Pengembang Web API",
    Ikon: Code2,
    warna: "sky",
  },
] as const;

/** Kelas warna ditulis lengkap, bukan dirangkai - Tailwind memindai teks kelas apa adanya. */
const WARNA: Record<string, { kotak: string; centang: string; tombol: string }> = {
  rose: {
    kotak: "bg-rose-600 shadow-rose-500/20",
    centang: "text-rose-600",
    tombol: "bg-rose-600 hover:bg-rose-700",
  },
  violet: {
    kotak: "bg-violet-600 shadow-violet-500/20",
    centang: "text-violet-600",
    tombol: "bg-violet-600 hover:bg-violet-700",
  },
  sky: {
    kotak: "bg-sky-600 shadow-sky-500/20",
    centang: "text-sky-600",
    tombol: "bg-sky-600 hover:bg-sky-700",
  },
};

export default function SpecialServicesSection({ tahunSkd }: { tahunSkd: number }) {
  return (
    <section id="layanan-khusus" className="py-24 bg-slate-100/70 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-3">
            <Layers className="w-4 h-4" />
            Integrasi Layanan & Inovasi
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Layanan Khusus & Program Inovasi Statistik
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Akses ke sistem rekomendasi statistik sektoral (ROMANTIK), Survei Kebutuhan Data (SKD), Silastik data mikro, dan program Desa Cinta Statistik (Desa Cantik).
          </p>
        </div>

        {/* Grid 2x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: ROMANTIK (Rekomendasi Statistik) */}
          <div
            className="glass-card p-8 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between hover:-translate-y-[4px] transition-transform duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  PP No. 51 Tahun 1999
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                ROMANTIK (Rekomendasi Kegiatan Statistik)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Layanan masukan dan rekomendasi BPS terhadap rancangan kegiatan survei statistik sektoral yang diselenggarakan oleh Kementerian, Lembaga, dan Organisasi Perangkat Daerah (OPD) Musi Rawas.
              </p>

              <div className="space-y-2 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Pemberitahuan rencana survei sektoral ke BPS</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Penjaminan kualitas metodologi & standar statistik</span>
                </div>
              </div>
            </div>

            <a
              href="https://romantik.web.bps.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <span>Akses Portal ROMANTIK BPS</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Card 2: SKD (Survei Kebutuhan Data) */}
          <div
            className="glass-card p-8 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between hover:-translate-y-[4px] transition-transform duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800">
                  Evaluasi Kepuasan & Anti Korupsi
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Survei Kebutuhan Data (SKD {tahunSkd})
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Survei tahunan untuk mengukur persepsi konsumen data mengenai kualitas pelayanan PST, kualitas data BPS, serta Indeks Persepsi Anti Korupsi (IPAK) BPS Musi Rawas.
              </p>

              <div className="space-y-2 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Evaluasi langsung kualitas pelayanan publik</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Masukan penyediaan indikator data statistik terbaru</span>
                </div>
              </div>
            </div>

            <a
              href="https://skd.bps.go.id/skd/s/1605"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <span>Isi Kuesioner SKD {tahunSkd}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Card 3: Desa Cantik */}
          <div
            className="glass-card p-8 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between hover:-translate-y-[4px] transition-transform duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Home className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  Inovasi Pembinaan Desa
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Program Desa Cantik (Cinta Statistik)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Program pembinaan BPS Kabupaten Musi Rawas untuk meningkatkan kapasitas aparatur desa dalam pengelolaan, otomatisasi, dan pemanfaatan data statistik akurat berbasis desa.
              </p>

              <div className="space-y-2 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Perencanaan pembangunan desa akurat berbasis data</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Portal dokumentasi & sistem informasi statistik desa</span>
                </div>
              </div>
            </div>

            <a
              href="https://descan1605.bpskabmusirawas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <span>Kunjungi Portal Desa Cantik Musi Rawas</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Card 4: Silastik & Data Wilkerstat */}
          <div
            className="glass-card p-8 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between hover:-translate-y-[4px] transition-transform duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Map className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  SILASTIK BPS RI
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Data Mikro & Peta Digital Wilkerstat
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Permohonan data mikro terarsip, publikasi cetakan resmi, dan peta digital Wilayah Kerja Statistik (Wilkerstat) BPS untuk pemetaan spasial & penelitian mendalam.
              </p>

              <div className="space-y-2 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Akses data micro anonymized riset akademik</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Batas wilayah kerja & peta spasial digital</span>
                </div>
              </div>
            </div>

            <a
              href="https://silastik.bps.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <span>Akses Portal SILASTIK BPS</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* ================= Layanan nasional BPS RI ================= */}
        <div className="mt-20">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold mb-3">
              <Building2 className="w-4 h-4" />
              Dikelola PST BPS Pusat
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Layanan Statistik Nasional
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              Layanan berikut disediakan langsung oleh BPS Republik Indonesia dan dapat
              diakses siapa saja, termasuk warga Musi Rawas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {LAYANAN_NASIONAL.map((l) => {
              const w = WARNA[l.warna];
              return (
                <div
                  key={l.nama}
                  className="glass-card p-7 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between hover:-translate-y-[4px] transition-transform duration-200"
                >
                  <div>
                    <div
                      className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-md mb-4 ${w.kotak}`}
                    >
                      <l.Ikon className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">{l.nama}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">{l.keterangan}</p>
                  </div>

                  <a
                    href={l.tautan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-white font-bold text-xs shadow-md transition-all ${w.tombol}`}
                  >
                    <span>{l.labelTautan}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>

          {/* Arahan ke PST BPS Pusat */}
          <div className="mt-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-cyan-950 p-8 sm:p-10 border border-indigo-500/30 shadow-2xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 justify-between">
              <div className="flex items-start gap-4 max-w-2xl">
                <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-white mb-1.5">
                    Belum menemukan layanan yang Anda cari?
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Pelayanan Statistik Terpadu BPS Pusat menghimpun seluruh layanan
                    statistik nasional dalam satu pintu - permintaan data lintas provinsi,
                    konsultasi metodologi tingkat nasional, hingga layanan yang belum
                    tersedia di kantor kabupaten.
                  </p>
                </div>
              </div>

              <a
                href="https://pst.bps.go.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full lg:w-auto shrink-0 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-lg transition-colors"
              >
                <span>Kunjungi PST BPS Pusat</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
