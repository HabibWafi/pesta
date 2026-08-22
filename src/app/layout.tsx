import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Atkinson_Hyperlegible } from "next/font/google";
import { Toaster } from "sonner";
import PelacakKunjungan from "@/components/PelacakKunjungan";
import PemulihChunk from "@/components/PemulihChunk";
import { KUNCI_SIMPANAN } from "@/lib/aksesibilitas";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/**
 * Font ramah disleksia, dipakai HANYA saat pengunjung menyalakannya.
 *
 * `preload: false` disengaja: berkasnya tidak ikut diunduh pengunjung yang
 * tidak memakainya. Atkinson Hyperlegible dirancang Braille Institute agar
 * huruf yang bentuknya mirip (I l 1, O 0) tetap bisa dibedakan - berbeda dari
 * mode "font mudah dibaca" versi lama, yang menjanjikan pergantian font tapi
 * sebenarnya hanya melebarkan spasi lalu jatuh ke font sistem.
 */
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  variable: "--font-atkinson",
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "PESTA | Pelayanan Statistik Digital BPS Kabupaten Musi Rawas",
  description:
    "Portal Layanan Statistik Digital Resmi BPS Kabupaten Musi Rawas. Konsultasi Statistik Virtual (ViDCon), Layanan Permintaan Data, dan Pengaduan Publik.",
  keywords: [
    "BPS Musi Rawas",
    "Pelayanan Statistik Digital",
    "PESTA BPS",
    "ViDCon BPS",
    "Konsultasi Statistik Online",
    "Musi Rawas Data",
  ],
  authors: [{ name: "BPS Kabupaten Musi Rawas" }],
  openGraph: {
    title: "PESTA - Pelayanan Statistik Digital BPS Musi Rawas",
    description:
      "Akses mudah, cepat, dan transparan untuk layanan data statistik BPS Musi Rawas secara gratis.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning di bawah WAJIB, bukan sekadar meredam peringatan.
  //
  // Skrip aksesibilitas di dalam <head> sengaja mengubah class dan style
  // <html> SEBELUM React sempat menghidrasi - itu memang tujuannya, supaya
  // tidak ada kedipan. Akibatnya DOM tidak lagi sama persis dengan hasil
  // render server, dan React melaporkannya sebagai ketidakcocokan hidrasi.
  //
  // Atribut ini memberi tahu React bahwa perbedaan pada elemen INI saja
  // memang disengaja. Pengaruhnya tidak menurun ke elemen anak, jadi
  // ketidakcocokan sungguhan di isi halaman tetap dilaporkan seperti biasa.
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${atkinson.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Jaring pengaman bagi pengunjung tanpa JavaScript.

          Elemen beranimasi masuk dirender dengan opacity 0 dan baru
          ditampilkan oleh skrip. Kalau skripnya tidak pernah jalan, seluruh
          isi halaman tak terlihat - bukan sekadar tanpa animasi, melainkan
          kosong. Aturan ini memaksanya tampil.
        */}
        <noscript>
          <style>{`[data-muncul]{opacity:1!important;transform:none!important;animation:none!important}`}</style>
        </noscript>

        {/*
          Menerapkan pengaturan aksesibilitas SEBELUM halaman digambar.

          Tanpa ini, pengunjung yang sudah menyalakan kontras tinggi atau teks
          besar melihat halaman versi normal lebih dulu selama sepersekian
          detik, lalu tampilannya melompat. Bagi orang yang menyalakan mode itu
          justru karena tampilan biasa menyakitkan atau tak terbaca, kedipan itu
          bukan hal sepele.

          Sengaja skrip mentah, bukan komponen React: React baru berjalan
          setelah render pertama - sudah terlambat.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem(${JSON.stringify(KUNCI_SIMPANAN)});if(!s)return;var p=JSON.parse(s),h=document.documentElement;var m={tebalTeks:"a11y-tebal",tinggiBaris:"a11y-tinggi-baris",jarakHuruf:"a11y-jarak-huruf",fontDisleksia:"a11y-font-disleksia",sorotTautan:"a11y-sorot-tautan",sorotJudul:"a11y-sorot-judul",fokusJelas:"a11y-fokus-jelas",kursorBesar:"a11y-kursor-besar",hentikanGerak:"a11y-diam",sembunyikanGambar:"a11y-sembunyikan-gambar"};for(var k in m){if(p[k])h.classList.add(m[k]);}if(p.warna&&p.warna!=="normal")h.classList.add("a11y-"+p.warna);if(p.ukuranTeks)h.style.setProperty("--a11y-skala-teks",p.ukuranTeks+"%");}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${plusJakartaSans.className} min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white flex flex-col`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <PelacakKunjungan />
        <PemulihChunk />
      </body>
    </html>
  );
}
