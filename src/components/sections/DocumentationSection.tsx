"use client";

import { Star, Quote, UserCheck } from "lucide-react";
import type { Testimonial } from "@/lib/db/schema";

interface DocumentationSectionProps {
  testimoni: Testimonial[];
}

export default function DocumentationSection({ testimoni }: DocumentationSectionProps) {
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
          {testimoni.map((item, index) => (
            <div
              key={index}
              className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden hover:-translate-y-[4px] transition-transform duration-200"
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
