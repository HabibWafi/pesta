"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { RotateCcw, Home, AlertOctagon, ShieldAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-8 relative z-10">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
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
        </motion.div>

        {/* Error Alert Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-2xl backdrop-blur-md">
            <AlertOctagon className="w-10 h-10 animate-pulse" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Terjadi Kendala Memuat Halaman
          </h1>

          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Sistem mendeteksi adanya gangguan sementara pada koneksi server. Silakan muat ulang atau coba beberapa saat lagi.
          </p>

          {error?.message && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 max-w-md mx-auto font-mono overflow-x-auto text-left">
              <code>Error: {error.message}</code>
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all hover:-translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Coba Memuat Lagi</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-md transition-all hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </motion.div>

        <div className="pt-6 text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-emerald-500" />
          <span>BPS Kabupaten Musi Rawas &bull; Sistem Terproteksi</span>
        </div>
      </div>
    </div>
  );
}
