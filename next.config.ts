import type { NextConfig } from "next";

/**
 * Konfigurasi Next.js.
 *
 * Dua hal yang diatur di sini keduanya berasal dari pengukuran Lighthouse
 * terhadap situs produksi, bukan dari tebakan.
 */
const nextConfig: NextConfig = {
  experimental: {
    /**
     * Memangkas impor pustaka ikon.
     *
     * `import { Users, Mail } from "lucide-react"` secara bawaan menarik
     * berkas indeks yang memuat ribuan ikon, dan pemangkasan kode mati tidak
     * selalu berhasil membuangnya. Opsi ini mengubahnya menjadi impor
     * per-ikon, sehingga yang terkirim hanya ikon yang benar-benar dipakai.
     */
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [
      {
        /**
         * Favicon adalah satu-satunya aset yang tidak punya header cache.
         *
         * Berkas ini diminta di SETIAP halaman, dan tanpa header cache
         * peramban memintanya berulang kali. Inilah yang membuat temuan
         * "Use efficient cache lifetimes" bernilai rendah - bukan berkas
         * /_next/static, yang sudah `immutable` selama setahun.
         *
         * Aman dipasang panjang karena Next menyisipkan sidik isi berkas ke
         * dalam URL-nya; berkas yang berubah menghasilkan URL baru.
         */
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
