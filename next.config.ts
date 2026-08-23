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
      {
        /**
         * Halaman statis TIDAK BOLEH di-cache CDN selama setahun.
         *
         * Next menandai halaman yang isinya tidak berubah dengan
         * `s-maxage=31536000`, dengan asumsi cache di depannya dibersihkan
         * setiap kali versi baru terbit. CDN Hostinger (hcdn) TIDAK
         * melakukan itu - terbukti di produksi: /admin/login tersaji dari
         * cache berumur 21 jam (`x-hcdn-cache-status: HIT`) meski sudah
         * beberapa kali deploy di antaranya.
         *
         * Akibatnya fatal, dan sudah benar-benar terjadi: nama berkas
         * JavaScript berubah tiap build dan yang lama dihapus, sehingga HTML
         * basi itu menunjuk ke berkas yang sudah tidak ada. Halaman tampil
         * tanpa gaya lalu menggantung - dan pemulih chunk otomatis pun tak
         * bisa menolong, karena ia ikut berada di JavaScript yang gagal
         * dimuat itu.
         *
         * /admin/* sudah ditangani `no-store` di src/proxy.ts. Aturan ini
         * untuk halaman PUBLIK yang statis (mis. /sinta, /dashboard) - warga
         * yang mengalaminya tidak punya siapa pun untuk dimintai tolong.
         *
         * 5 menit + stale-while-revalidate: pengunjung tetap dilayani
         * seketika dari cache, sementara CDN menyegarkan diri di latar. Sama
         * dengan yang sudah dipakai halaman depan.
         */
        source: "/:path((?!_next|api|admin).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=3600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
