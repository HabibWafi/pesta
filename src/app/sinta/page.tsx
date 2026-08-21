"use client";

import Link from "next/link";
import { Bot, ArrowLeft, Sparkles, Clock, ShieldCheck, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export default function SintaPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full text-center relative z-10 space-y-8">
        {/* Back Link */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda PESTA
          </Link>
        </div>

        {/* Animated Bot Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative inline-block"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-1 shadow-2xl shadow-indigo-500/40 mx-auto">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center relative">
              <Bot className="w-12 h-12 text-cyan-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 animate-ping" />
            </div>
          </div>
        </motion.div>

        {/* Development Badge & Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
            <Clock className="w-4 h-4" />
            Fitur Dalam Masa Pengembangan
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Sinta (aSisten Digital BPS)
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Layanan kecerdasan buatan (AI Assistant) BPS Kabupaten Musi Rawas sedang dalam tahap pengujian integrasi dan akan segera rilis untuk melayani Anda 24/7.
          </p>
        </div>

        {/* Feature Teaser Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
              <Cpu className="w-4 h-4" />
              <span>AI Data Query</span>
            </div>
            <p className="text-xs text-slate-400">
              Tanya jawab data statistik PDRB, inflasi, & kependudukan instan.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Respon 24 Jam</span>
            </div>
            <p className="text-xs text-slate-400">
              Pemanduan layanan publik otomatis tanpa membatasi jam kerja.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div>
          <Link
            href="/#vidcon"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-xs shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            <span>Gunakan Layanan ViDCon Sementara</span>
            <Sparkles className="w-4 h-4 text-cyan-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
