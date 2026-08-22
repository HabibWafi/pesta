"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { adalahGalatChunk } from "@/lib/pemulihan-chunk";

/**
 * Menangkap chunk yang gagal dimuat DI LUAR jangkauan batas galat React.
 *
 * src/app/error.tsx hanya menangkap galat yang terjadi saat React merender.
 * Padahal kasus yang paling sering dialami warga justru bukan itu: menekan
 * tombol "Daftar ViDCon" atau "Ajukan Permintaan Data" memicu impor dinamis
 * dari dalam penangan klik, dan kalau chunk-nya sudah tidak ada (situs baru
 * di-deploy), yang terjadi adalah promise ditolak tanpa ada yang menangkap.
 * React tidak melihatnya sama sekali - tombolnya sekadar tidak melakukan
 * apa-apa, dan warga menekannya berulang kali tanpa tahu apa yang salah.
 *
 * SENGAJA TIDAK memuat ulang sendiri, berbeda dari error.tsx. Di sini
 * halaman masih utuh dan pengunjung bisa saja sedang mengisi formulir
 * panjang di modal lain; memuat ulang diam-diam akan menghapus ketikannya
 * tanpa permisi. Yang ditawarkan cuma pemberitahuan jelas berikut tombolnya,
 * dan keputusannya ada di tangan pengunjung.
 */
export default function PemulihChunk() {
  useEffect(() => {
    let sudahDiberitahu = false;

    const tangani = (galat: unknown) => {
      if (!adalahGalatChunk(galat) || sudahDiberitahu) return;

      // Sekali saja per kunjungan - memberi tahu hal yang sama berulang kali
      // hanya menambah panik, padahal tindakannya tetap satu dan sama.
      sudahDiberitahu = true;

      toast.warning("Versi baru situs sudah tersedia", {
        description:
          "Ada pembaruan sejak halaman ini dibuka, jadi sebagian isi tidak bisa dimuat. " +
          "Muat ulang untuk melanjutkan.",
        duration: Infinity,
        action: {
          label: "Muat Ulang",
          onClick: () => window.location.reload(),
        },
      });
    };

    const padaRejeksi = (e: PromiseRejectionEvent) => tangani(e.reason);
    const padaGalat = (e: ErrorEvent) => tangani(e.error ?? e.message);

    window.addEventListener("unhandledrejection", padaRejeksi);
    window.addEventListener("error", padaGalat);
    return () => {
      window.removeEventListener("unhandledrejection", padaRejeksi);
      window.removeEventListener("error", padaGalat);
    };
  }, []);

  return null;
}
