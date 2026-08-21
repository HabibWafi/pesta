"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, ShieldCheck } from "lucide-react";

export default function ZeroRupiahSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = "WohKX49NEoc";

  return (
    <section id="nol-rupiah" className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4">
            <ShieldCheck className="w-4 h-4" />
            Komitmen Integritas & Bebas Pungli
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Pelayanan Publik{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Nol Rupiah (0 Rp)
            </span>
          </h2>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Seluruh layanan statistik, konsultasi ViDCon, data publikasi, serta rekomendasi statistik yang diberikan oleh BPS Kabupaten Musi Rawas diselenggarakan tanpa dipungut biaya apapun (Gratis).
          </p>
        </div>

        {/* Video Embed Facade with Real YouTube Thumbnail */}
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 aspect-video group">
            {!isPlaying ? (
              <div 
                className="relative w-full h-full flex flex-col items-center justify-center text-center p-6 cursor-pointer overflow-hidden" 
                onClick={() => setIsPlaying(true)}
              >
                {/* Real YouTube Video Thumbnail Image */}
                <Image
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt="Thumbnail Video Layanan Nol Rupiah BPS Musi Rawas"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                  unoptimized
                />
                
                {/* Dark Overlay Gradient for High Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 group-hover:opacity-80 transition-opacity" />

                {/* Animated Glowing Play Icon Button */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 p-1 shadow-2xl shadow-cyan-500/40 group-hover:scale-110 transition-transform duration-300 relative z-10 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950/90 rounded-full flex items-center justify-center pl-1 backdrop-blur-sm">
                    <Play className="w-8 h-8 text-cyan-400 fill-cyan-400" />
                  </div>
                </div>

                <div className="mt-6 relative z-10 space-y-2 max-w-xl">
                  <span className="px-3.5 py-1 rounded-full bg-indigo-500/80 backdrop-blur-md text-white text-xs font-bold border border-indigo-300/30 shadow-md">
                    Tonton Video Edukasi
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                    Video Komitmen Layanan Nol Rupiah BPS Musi Rawas
                  </h3>
                  <p className="text-xs text-slate-300 font-medium drop-shadow">
                    Klik untuk memutar video resmi (YouTube)
                  </p>
                </div>
              </div>
            ) : (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="Video Layanan Nol Rupiah BPS Musi Rawas"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
