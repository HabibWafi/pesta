import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
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
  icons: {
    icon: "/images/pesta_logo.png",
    shortcut: "/images/pesta_logo.png",
    apple: "/images/pesta_logo.png",
  },
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
      <body className={`${plusJakartaSans.className} min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white flex flex-col`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
