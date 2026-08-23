"use client";

import Link from "next/link";
import {
  Bot,
  FileSpreadsheet,
  MessageSquareHeart,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  LayoutDashboard,
  Award,
  FileCheck2,
  Map
} from "lucide-react";

/** Kelas kolom per jumlah kartu. Nama kelasnya ditulis utuh supaya ikut ter-build Tailwind. */
const KOLOM_GRID: Record<number, string> = {
  1: "lg:grid-cols-1 lg:max-w-md lg:mx-auto",
  2: "lg:grid-cols-2 lg:max-w-3xl lg:mx-auto",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-3",
  6: "lg:grid-cols-3",
  7: "lg:grid-cols-4",
};

interface ServicesSectionProps {
  onOpenVidcon: () => void;
  onOpenPengaduan: () => void;
  onOpenPermintaanData: () => void;
  /** Fitur yang masih dikembangkan, disaklar dari /admin/konten. */
  tampilSinta: boolean;
  tampilDashboard: boolean;
  /** Tahun berjalan WIB, untuk label Survei Kebutuhan Data. */
  tahunSkd: number;
}

export default function ServicesSection({
  onOpenVidcon,
  onOpenPengaduan,
  onOpenPermintaanData,
  tampilSinta,
  tampilDashboard,
  tahunSkd,
}: ServicesSectionProps) {
  const semuaKartu = [
    {
      kunci: "sinta",
      badge: "Asisten Digital Cerdas",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
      icon: Bot,
      iconColor: "bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white",
      title: "Sinta (aSisten Digital)",
      desc: "Asisten kecerdasan digital BPS Musi Rawas untuk menjawab pertanyaan data statistik & panduan layanan 24/7.",
      features: ["Respon Instan Data Statistik", "Informasi Inflasi, PDRB & IPM"],
      buttonText: "Akses Sinta AI",
      buttonHref: "/sinta",
      buttonType: "internal",
      buttonStyle: "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:from-indigo-500 hover:to-cyan-500 shadow-md shadow-indigo-500/20",
      hasSparkle: true,
    },
    {
      kunci: "dashboard",
      badge: "Visualisasi Data Interaktif",
      badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-100",
      icon: LayoutDashboard,
      iconColor: "bg-gradient-to-tr from-cyan-600 to-blue-600 text-white",
      title: "Dashboard Data Strategis",
      desc: "Visualisasi grafik dan analisis indikator makro PDRB, inflasi, IPM, dan kependudukan Musi Rawas.",
      features: ["Grafik PDRB & Pertumbuhan", "Tingkat Inflasi & IPM Daerah"],
      buttonText: "Buka Dashboard Data",
      buttonHref: "/dashboard",
      buttonType: "internal",
      buttonStyle: "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10",
      hasSparkle: false,
    },
    {
      badge: "Permohonan Data Official",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
      icon: FileSpreadsheet,
      iconColor: "bg-gradient-to-tr from-blue-600 to-emerald-500 text-white",
      title: "Layanan Data Statistik",
      desc: "Akses publikasi resmi, tabel statistik, data mikro, dan peta spasial BPS Kabupaten Musi Rawas.",
      features: ["PDRB & Perekonomian Daerah", "Kependudukan & Ketenagakerjaan"],
      buttonText: "Portal BPS Musi Rawas",
      buttonHref: "https://musirawaskab.bps.go.id",
      buttonType: "external",
      buttonStyle: "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
      hasSparkle: false,
      // Portal di atas untuk menjelajah publikasi yang sudah terbit. Tombol
      // kedua ini untuk data spesifik yang belum tentu ada di publikasi -
      // permintaan resmi yang masuk ke petugas PST, bukan tautan keluar.
      secondaryButtonText: "Ajukan Permintaan Data",
      secondaryButtonAction: onOpenPermintaanData,
    },
    {
      badge: "PP No. 51 Tahun 1999",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
      icon: Award,
      iconColor: "bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white",
      title: "ROMANTIK (Rekomendasi Statistik)",
      desc: "Masukan dan rekomendasi BPS terhadap rancangan kegiatan survei statistik sektoral oleh Kementerian, Lembaga, dan OPD Musi Rawas.",
      features: ["Pemberitahuan rencana survei sektoral", "Penjaminan kualitas metodologi statistik"],
      buttonText: "Akses Portal ROMANTIK",
      buttonHref: "https://romantik.web.bps.go.id",
      buttonType: "external",
      buttonStyle: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20",
      hasSparkle: false,
    },
    {
      badge: "Evaluasi Kepuasan & Anti Korupsi",
      badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-100",
      icon: FileCheck2,
      iconColor: "bg-gradient-to-tr from-cyan-600 to-cyan-400 text-white",
      title: `Survei Kebutuhan Data (SKD ${tahunSkd})`,
      desc: "Survei tahunan pengukuran kepuasan layanan PST, kualitas data BPS, dan Indeks Persepsi Anti Korupsi (IPAK) Musi Rawas.",
      features: ["Evaluasi kualitas pelayanan publik", "Masukan indikator data terbaru"],
      buttonText: `Isi Kuesioner SKD ${tahunSkd}`,
      buttonHref: "https://skd.bps.go.id/skd/s/1605",
      buttonType: "external",
      buttonStyle: "bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-500/20",
      hasSparkle: false,
    },
    {
      badge: "SILASTIK BPS RI",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-100",
      icon: Map,
      iconColor: "bg-gradient-to-tr from-amber-600 to-amber-400 text-white",
      title: "Data Mikro & Peta Digital Wilkerstat",
      desc: "Permohonan data mikro terarsip, publikasi cetakan resmi, dan peta digital Wilayah Kerja Statistik (Wilkerstat) BPS.",
      features: ["Akses data mikro anonim riset akademik", "Batas wilayah kerja & peta spasial digital"],
      buttonText: "Akses Portal SILASTIK",
      buttonHref: "https://silastik.bps.go.id",
      buttonType: "external",
      buttonStyle: "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20",
      hasSparkle: false,
    },
    {
      badge: "Masukan & Aspirasi",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-100",
      icon: MessageSquareHeart,
      iconColor: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white",
      title: "Pengaduan & Feedback",
      desc: "Kanal aspirasi publik untuk menyampaikan masukan atau pengaduan kualitas layanan BPS Musi Rawas.",
      features: ["Kerahasiaan Identitas Terjamin", "Tindak Lanjut Cepat Staf Pengawas"],
      buttonText: "Kirim Pengaduan",
      buttonAction: onOpenPengaduan,
      buttonType: "modal",
      buttonStyle: "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold",
      hasSparkle: false,
    },
  ];

  /*
   * Fitur yang masih dikembangkan disaring di sini, bukan disembunyikan
   * lewat CSS. Kartu yang cuma disembunyikan tetap ada di HTML - terbaca
   * pembaca layar, terindeks mesin pencari, dan tautannya tetap bisa
   * ditemukan. Untuk sesuatu yang memang belum siap dipakai warga, itu
   * bukan "tersembunyi".
   *
   * Grid-nya memakai lebar otomatis, jadi sisa kartunya merapat sendiri
   * tanpa meninggalkan ruang kosong.
   */
  const cards = semuaKartu.filter((k) => {
    if (k.kunci === "sinta") return tampilSinta;
    if (k.kunci === "dashboard") return tampilDashboard;
    return true;
  });

  return (
    <section id="layanan" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 mb-3">
            Layanan Utama PESTA
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Solusi Digital Terpadu Pelayanan Statistik BPS Musi Rawas
          </p>
          <p className="mt-4 text-base text-slate-600">
            Pilih jenis layanan statistik yang Anda butuhkan secara online tanpa perlu antre di kantor.
          </p>
        </div>

        {/*
          Jumlah kolom mengikuti jumlah kartu yang benar-benar tampil.
          Dipatok dengan nama kelas utuh, bukan dirangkai dari variabel -
          Tailwind memindai kode sebagai teks, jadi kelas yang dibentuk saat
          program berjalan tidak pernah ikut ter-build.
        */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${KOLOM_GRID[cards.length] ?? "lg:grid-cols-4"}`}>
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl p-7 bg-white border border-slate-200/90 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-[6px]"
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${card.iconColor} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    {card.title}
                    {card.hasSparkle && <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />}
                  </h3>

                  <p className="text-slate-600 text-xs leading-relaxed mb-6">
                    {card.desc}
                  </p>

                  {/* Feature Checklist */}
                  <ul className="space-y-2.5 text-xs text-slate-600 mb-8 pt-4 border-t border-slate-100">
                    {card.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-medium text-slate-700">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Harmonized Button Actions */}
                <div className="space-y-2">
                  {card.buttonType === "internal" ? (
                    <Link
                      href={card.buttonHref!}
                      className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all ${card.buttonStyle}`}
                    >
                      <span>{card.buttonText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : card.buttonType === "external" ? (
                    <a
                      href={card.buttonHref!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all ${card.buttonStyle}`}
                    >
                      <span>{card.buttonText}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      onClick={card.buttonAction}
                      className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all ${card.buttonStyle}`}
                    >
                      <span>{card.buttonText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {card.secondaryButtonText && (
                    <button
                      onClick={card.secondaryButtonAction}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs border border-blue-200 text-blue-700 hover:bg-blue-50 transition-all"
                    >
                      <span>{card.secondaryButtonText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
