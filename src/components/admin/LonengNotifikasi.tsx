"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";

interface Rincian {
  label: string;
  jumlah: number;
  href: string;
}

/**
 * Lonceng "ada yang perlu ditangani" di header admin.
 *
 * Polling ringan tiap 60 detik - endpointnya hanya mengembalikan tiga angka
 * hasil COUNT, bukan isi datanya. Sengaja tidak memakai SSE atau WebSocket:
 * Hostinger Business membatasi Entry Process, dan tiap koneksi terbuka
 * memakan jatah itu. Pertimbangan yang sama berlaku untuk inbox Beregam nanti.
 */
export default function LonengNotifikasi({ gelap }: { gelap: boolean }) {
  const [total, setTotal] = useState(0);
  const [rincian, setRincian] = useState<Rincian[]>([]);
  const [buka, setBuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);

  const ambil = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifikasi");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setTotal(json.total);
        setRincian(json.rincian);
      }
    } catch {
      // Gagal memuat notifikasi tidak boleh mengganggu pekerjaan petugas.
    }
  }, []);

  useEffect(() => {
    void ambil();
    const timer = window.setInterval(() => void ambil(), 60_000);
    return () => window.clearInterval(timer);
  }, [ambil]);

  // Tutup saat mengklik di luar panel.
  useEffect(() => {
    if (!buka) return;
    const luar = (e: MouseEvent) => {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("mousedown", luar);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", luar);
      document.removeEventListener("keydown", escape);
    };
  }, [buka]);

  return (
    <div className="relative" ref={wadah}>
      <button
        onClick={() => setBuka(!buka)}
        aria-label={
          total > 0 ? `Notifikasi, ${total} hal perlu ditangani` : "Notifikasi, tidak ada yang baru"
        }
        aria-expanded={buka}
        className={`relative p-2 rounded-2xl border transition-all ${
          gelap
            ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
        }`}
        title="Hal yang perlu ditangani"
      >
        <Bell className="w-4 h-4" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {buka && (
        <div
          className={`absolute right-0 mt-2 w-72 rounded-2xl border shadow-xl z-50 overflow-hidden ${
            gelap ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`px-4 py-2.5 border-b text-xs font-bold ${
              gelap ? "border-slate-800 text-white" : "border-slate-100 text-slate-900"
            }`}
          >
            Perlu Ditangani
          </div>

          {total === 0 ? (
            <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className={`text-xs ${gelap ? "text-slate-400" : "text-slate-500"}`}>
                Semua sudah ditangani.
              </p>
            </div>
          ) : (
            <ul className={gelap ? "divide-y divide-slate-800" : "divide-y divide-slate-100"}>
              {rincian
                .filter((r) => r.jumlah > 0)
                .map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      onClick={() => setBuka(false)}
                      className={`flex items-center justify-between gap-3 px-4 py-3 text-xs transition-colors ${
                        gelap ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span>{r.label}</span>
                      <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                        {r.jumlah}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
