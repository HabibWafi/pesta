"use client";

import { motion } from "framer-motion";
import { Camera, Star, Quote, CheckCircle2, UserCheck } from "lucide-react";

interface Testimonial {
  nama: string;
  peran: string;
  instansi: string;
  pesan: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    nama: "H. Supriyadi, M.Si",
    peran: "Kepala Bidang Perencanaan",
    instansi: "Bappeda Musi Rawas",
    pesan: "Layanan ViDCon PESTA BPS Musi Rawas sangat membantu kami dalam koordinasi penyusunan data indikator makro PDRB dan kemiskinan daerah tanpa perlu datang langsung. Responnya sangat cepat!",
    rating: 5,
  },
  {
    nama: "Rina Kartika",
    peran: "Mahasiswa Tingkat Akhir",
    instansi: "Universitas Musi Rawas",
    pesan: "Sangat dimudahkan saat minta konsultasi metodologi survei untuk skripsi saya. Staf BPS memberikan penjelasan yang ramah, jelas, dan 100% gratis (Layanan Nol Rupiah).",
    rating: 5,
  },
  {
    nama: "Budi Santoso, S.ST",
    peran: "Peneliti Ekonomi Daerah",
    instansi: "Lembaga Riset Publik",
    pesan: "Portal PESTA versi baru ini tampilannya jauh lebih keren, modern, dan gampang dipakai di HP. Rekomendasi statistik ROMANTIK dan data mikronya mudah diakses.",
    rating: 5,
  },
];

export default function DocumentationSection() {
  return (
    <section id="dokumentasi" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
            <UserCheck className="w-4 h-4" />
            Dokumentasi & Umpan Balik Pengguna
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Ulasan & Pengalaman Pelayanan Publik BPS
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Apresiasi dan testimoni nyata dari OPD, akademisi, dan masyarakat pengguna data statistik BPS Musi Rawas.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -4 }}
              className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-slate-200 pointer-events-none" />

              <div>
                {/* Rating Stars */}
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                <p className="text-sm text-slate-700 leading-relaxed italic mb-6 relative z-10">
                  "{item.pesan}"
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
                  {item.nama.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{item.nama}</h4>
                  <p className="text-xs text-slate-500">
                    {item.peran} • <span className="font-semibold text-indigo-600">{item.instansi}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
