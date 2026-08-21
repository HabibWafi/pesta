"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mengirim satu ketukan ke /api/track setiap kali halaman publik dibuka.
 *
 * Sengaja dikirim setelah halaman ter-render, bukan lewat middleware:
 * tidak menambah latensi permintaan halaman, dan perayap yang tidak
 * menjalankan JavaScript tersaring dengan sendirinya.
 *
 * Halaman admin tidak dihitung - yang ingin diketahui adalah kunjungan
 * warga, bukan seberapa sering petugas membuka panelnya sendiri.
 */
export default function PelacakKunjungan() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const kirim = () => {
      // keepalive supaya ketukan tetap terkirim walau pengunjung langsung
      // berpindah halaman.
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname.slice(0, 190),
          referrer: document.referrer ? new URL(document.referrer).hostname.slice(0, 190) : "",
        }),
        keepalive: true,
      }).catch(() => {
        // Gagal mencatat statistik tidak boleh mengganggu pengunjung.
      });
    };

    // Ditunda sebentar agar tidak berebut jaringan dengan pemuatan halaman.
    const timer = window.setTimeout(kirim, 800);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
