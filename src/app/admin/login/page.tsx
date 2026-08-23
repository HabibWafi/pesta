"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * TIDAK ADA lagi pemeriksaan sesi di sisi klien di sini.
   *
   * Dulu halaman ini membuka dengan layar "Memeriksa Sesi Login...", memanggil
   * /api/auth/me, baru menampilkan formulir. Konsekuensinya fatal: bila
   * JavaScript-nya gagal dimuat - misalnya peramban memegang HTML lama yang
   * menyebut berkas yang sudah dihapus deploy berikutnya - tidak ada apa pun
   * yang mengubah layar itu, dan petugas menatap teks menggantung tanpa gaya
   * selamanya. Formulirnya sendiri sebenarnya sudah ada di HTML; hanya
   * disembunyikan oleh keadaan yang tak pernah berubah.
   *
   * Sekarang formulir langsung tampil, dan yang sudah punya sesi dialihkan
   * lebih awal oleh src/proxy.ts - di sana sesinya memang sudah diverifikasi.
   */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login gagal");
      }

      toast.success("Login Admin Berhasil!", {
        description: `Selamat datang kembali, ${data.user.name}`,
      });

      /*
       * Kembali ke halaman yang tadi dituju sebelum diminta login.
       *
       * Dibaca dari window, BUKAN useSearchParams(). useSearchParams memaksa
       * Next melepas render di server untuk seluruh halaman ini
       * (BAILOUT_TO_CLIENT_SIDE_RENDERING), sehingga formulirnya hilang dari
       * HTML dan hanya muncul setelah JavaScript berjalan - persis kerapuhan
       * yang sedang diperbaiki di berkas ini. Di dalam penangan submit kita
       * sudah pasti berada di peramban, jadi window aman dibaca.
       *
       * Nilainya dipastikan mengarah ke dalam /admin: tanpa itu, tautan
       * berisi ?lanjut=//situs-lain bisa dipakai memantulkan petugas ke luar
       * tepat setelah ia login.
       */
      const lanjut = new URLSearchParams(window.location.search).get("lanjut");
      const tujuan = lanjut && /^\/admin(\/|$)/.test(lanjut) ? lanjut : "/admin/dashboard";
      router.push(tujuan);
    } catch (err) {
      toast.error("Gagal Autentikasi Admin", {
        description:
          err instanceof Error ? err.message : "Periksa kembali email & password Anda.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative z-10 border border-slate-100">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-200 shadow-lg mx-auto flex items-center justify-center p-1 mb-4">
            <Image
              src="/images/pesta_logo.png"
              alt="Logo PESTA BPS"
              width={60}
              height={60}
              className="object-contain w-full h-full rounded-xl"
            />
          </div>
          <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 uppercase tracking-wider border border-indigo-100">
            Portal Administrator BPS
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">PESTA Admin Login</h1>
          <p className="text-xs text-slate-500 mt-1">
            BPS Kabupaten Musi Rawas
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Admin
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="habibwafi96@gmail.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-indigo-600" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
          >
            <span>{loading ? "Authenticating..." : "Masuk ke Panel Admin"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Sistem Terproteksi BPS Kabupaten Musi Rawas</span>
        </div>
      </div>
    </div>
  );
}
