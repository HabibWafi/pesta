"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Animasi "muncul" - pengganti framer-motion untuk halaman utama.
 *
 * KENAPA TIDAK MEMAKAI framer-motion
 *
 * Seluruh section halaman depan hanya memerlukan dua efek: memudar sambil
 * naik saat masuk layar, dan memudar naik saat halaman dibuka. Tidak ada
 * drag, tidak ada layout animation, tidak ada gerak berbasis fisika.
 *
 * Untuk itu framer-motion menagih 116 KB JavaScript yang harus diunduh,
 * diurai, DAN dijalankan sebelum halaman bisa disentuh. Pengukuran
 * Lighthouse menemukannya sebagai penyumbang terbesar Time to Interactive
 * dan Max Potential First Input Delay - dua metrik yang keduanya mengukur
 * berapa lama pengunjung menatap halaman yang belum bisa dipakai.
 *
 * framer-motion tetap dipakai di modal dan widget aksesibilitas - keduanya
 * dimuat belakangan dan tidak menahan halaman.
 *
 * DUA PEMICU, DUA MEKANISME BERBEDA
 *
 * `segera` memakai animasi CSS murni: tidak ada state, tidak ada effect,
 * tidak ada render kedua. Elemen yang harus tampil begitu halaman dibuka
 * tidak perlu menunggu React sama sekali.
 *
 * `layar` memakai IntersectionObserver, karena memang harus menunggu
 * peristiwa dari luar React.
 */

const AWAL: Record<string, string> = {
  naik: "translateY(20px)",
  turun: "translateY(-20px)",
  kiri: "translateX(-20px)",
  kanan: "translateX(20px)",
  skala: "scale(0.9)",
  diam: "none",
};

interface MunculProps {
  children: ReactNode;
  /** Tag HTML yang dihasilkan. Penting untuk struktur semantik. */
  as?: ElementType;
  className?: string;
  /** Jeda sebelum mulai, dalam detik - untuk efek berurutan. */
  delay?: number;
  /** Lama transisi, dalam detik. */
  duration?: number;
  /** Arah datangnya. `naik` = bergeser dari bawah (bawaan). */
  arah?: "naik" | "turun" | "kiri" | "kanan" | "skala" | "diam";
  /**
   * `layar` menunggu elemen masuk layar (pengganti whileInView).
   * `segera` berjalan begitu halaman dibuka (pengganti animate saat muat).
   */
  pemicu?: "layar" | "segera";
  id?: string;
}

export default function Muncul({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  duration = 0.6,
  arah = "naik",
  pemicu = "layar",
  id,
}: MunculProps) {
  const ref = useRef<HTMLElement>(null);
  const [terlihat, setTerlihat] = useState(false);

  useEffect(() => {
    // Pemicu `segera` ditangani sepenuhnya oleh CSS; tidak ada yang perlu
    // diamati, dan tidak ada state yang perlu diubah.
    if (pemicu === "segera") return;

    const el = ref.current;
    if (!el) return;

    // Tanpa dukungan IntersectionObserver, tampilkan saja. Halaman yang
    // isinya tidak pernah muncul jauh lebih buruk daripada halaman tanpa
    // animasi.
    //
    // Dijadwalkan lewat requestAnimationFrame, bukan dipanggil langsung:
    // mengubah state di dalam badan effect memicu render berantai. Nilai
    // awalnya juga tidak bisa dihitung saat render, karena di server
    // IntersectionObserver selalu tidak ada - hasilnya akan berbeda dengan
    // di peramban dan hidrasi tidak cocok.
    if (typeof IntersectionObserver === "undefined") {
      const bingkai = requestAnimationFrame(() => setTerlihat(true));
      return () => cancelAnimationFrame(bingkai);
    }

    const pengamat = new IntersectionObserver(
      (entri) => {
        if (entri[0]?.isIntersecting) {
          setTerlihat(true);
          pengamat.disconnect();
        }
      },
      // Sedikit lebih awal dari tepi layar, supaya animasinya sudah selesai
      // ketika elemennya benar-benar terlihat.
      { rootMargin: "0px 0px -80px 0px", threshold: 0.05 }
    );

    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [pemicu]);

  const geser = AWAL[arah] ?? "none";

  const gaya: CSSProperties =
    pemicu === "segera"
      ? ({
          "--muncul-awal": geser,
          animation: `muncul ${duration}s ease-out ${delay}s both`,
        } as CSSProperties)
      : {
          opacity: terlihat ? 1 : 0,
          transform: terlihat ? "none" : geser,
          transition: `opacity ${duration}s ease-out ${delay}s, transform ${duration}s ease-out ${delay}s`,
          // Memberi tahu peramban apa yang akan berubah, sehingga lapisan
          // komposisinya disiapkan lebih dulu dan tidak ada lonjakan kerja
          // pada frame pertama animasi.
          willChange: terlihat ? "auto" : "opacity, transform",
        };

  return (
    // data-muncul menandai elemen yang awalnya transparan, supaya bisa
    // dipaksa tampil lewat <noscript> di layout. Tanpa itu, pengunjung
    // dengan JavaScript mati - atau yang skripnya gagal dimuat - melihat
    // halaman kosong, bukan halaman tanpa animasi.
    <Tag ref={ref} id={id} className={className} style={gaya} data-muncul="">
      {children}
    </Tag>
  );
}
