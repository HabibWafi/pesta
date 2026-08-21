import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="relative w-16 h-16 rounded-2xl bg-white p-1 shadow-2xl flex items-center justify-center border border-slate-700 animate-bounce">
          <Image
            src="/images/pesta_logo.png"
            alt="Logo PESTA BPS"
            width={60}
            height={60}
            className="object-contain w-full h-full rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" style={{ animationDelay: '0.2s' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" style={{ animationDelay: '0.4s' }} />
        </div>

        <p className="text-xs font-bold text-slate-300 tracking-wider uppercase mt-2">
          Memuat Layanan PESTA BPS Musi Rawas...
        </p>
      </div>
    </div>
  );
}
