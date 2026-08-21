import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import PelacakKunjungan from "@/components/PelacakKunjungan";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
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
  return (
    <html lang="id" className={`${plusJakartaSans.variable} scroll-smooth`}>
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
      </head>
      <body className={`${plusJakartaSans.className} min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white flex flex-col`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <PelacakKunjungan />
      </body>
    </html>
  );
}
