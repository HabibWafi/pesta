"use client";

import Link from "next/link";
import Image from "next/image";
import Muncul from "@/components/ui/Muncul";
import { Home, ArrowLeft, FileQuestion, Sparkles, MessageCircleQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Animated Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-8 relative z-10">
        {/* Brand Header */}
        <Muncul
          pemicu="segera"
          arah="skala"
          duration={0.5}
          className="inline-flex items-center gap-3 bg-slate-800/80 p-2.5 px-5 rounded-full border border-slate-700 backdrop-blur-md shadow-xl"
        >
          <div className="w-8 h-8 rounded-xl bg-white p-0.5 shadow-md flex items-center justify-center">
            <Image
              src="/images/pesta_logo.png"
              alt="Logo PESTA BPS"
              width={32}
              height={32}
              className="object-contain w-full h-full rounded-md"
            />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            PESTA BPS Musi Rawas
          </span>
        </Muncul>

        {/* 404 Badge & Heading */}
        <Muncul
          pemicu="segera"
          delay={0.1}
          className="space-y-4"
        >
          <div className="relative inline-block">
            <h1 className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent opacity-90 drop-shadow-2xl">
              404
            </h1>
            <div className="absolute -top-3 -right-4 p-2 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 backdrop-blur-md animate-bounce">
              <FileQuestion className="w-6 h-6" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Halaman Tidak Ditemukan
          </h2>

          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Maaf, alamat tautan yang Anda tuju tidak dapat ditemukan atau mungkin telah dipindahkan ke layanan statistik baru.
          </p>
        </Muncul>

        {/* Navigation Action Buttons */}
        <Muncul
          pemicu="segera"
          delay={0.2}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda Utama</span>
          </Link>

          <Link
            href="/#kontak"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-md transition-all hover:-translate-y-0.5"
          >
            <MessageCircleQuestion className="w-4 h-4 text-cyan-400" />
            <span>Pusat Bantuan PST</span>
          </Link>
        </Muncul>

        {/* Footer Note */}
        <Muncul
          pemicu="segera"
          arah="diam"
          duration={0.5}
          delay={0.3}
          className="pt-8 text-xs text-slate-500 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>BPS Kabupaten Musi Rawas &bull; Pelayanan Statistik Digital</span>
        </Muncul>
      </div>
    </div>
  );
}
