"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Video, 
  ShieldAlert, 
  Mail, 
  Clock, 
  ArrowRight,
  Database
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Fetch Stats Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider">
            Ringkasan Administrasi PESTA v2.0
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-3">
            Selamat Datang di Panel Kelola Data
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Monitor permohonan ViDCon, tindak lanjuti pengaduan publik, dan respon pertanyaan statistik masuk dari masyarakat Musi Rawas.
          </p>
        </div>
      </div>

      {/* Widget Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Widget 1: ViDCon */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
              <Video className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {loading ? "..." : stats?.pendingVidcon || 0} Pending
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {loading ? "..." : stats?.totalVidcon || 0}
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Total Permohonan ViDCon Masuk
            </p>
          </div>
          <Link
            href="/admin/vidcon"
            className="inline-flex items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-700 pt-2 border-t border-slate-100"
          >
            <span>Kelola Permohonan ViDCon</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Widget 2: Pengaduan */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {loading ? "..." : stats?.pendingPengaduan || 0} Belum Direspon
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {loading ? "..." : stats?.totalPengaduan || 0}
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Total Pengaduan Publik Mandiri
            </p>
          </div>
          <Link
            href="/admin/pengaduan"
            className="inline-flex items-center justify-between text-xs font-bold text-amber-600 hover:text-amber-700 pt-2 border-t border-slate-100"
          >
            <span>Tindak Lanjuti Pengaduan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Widget 3: Contact Messages */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600">
              <Mail className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {loading ? "..." : stats?.unreadContact || 0} Unread
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {loading ? "..." : stats?.totalContact || 0}
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Pesan Kontak & Pertanyaan PST
            </p>
          </div>
          <Link
            href="/admin/contact"
            className="inline-flex items-center justify-between text-xs font-bold text-cyan-600 hover:text-cyan-700 pt-2 border-t border-slate-100"
          >
            <span>Lihat Pesan Kontak</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* System Status Box */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Status Penyimpanan Data PESTA</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh data permohonan, pengaduan, dan pesan kontak terhubung aman dengan sistem penyimpanan lokal.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          TERHUBUNG AMAN
        </span>
      </div>
    </div>
  );
}
