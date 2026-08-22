"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import ServicesSection from "@/components/sections/ServicesSection";
import Footer from "@/components/layout/Footer";
import type { Faq, Testimonial } from "@/lib/db/schema";
import type { Pengaturan } from "@/lib/content";

/**
 * Bagian yang dimuat belakangan.
 *
 * Dua kelompok, dengan alasan yang berbeda:
 *
 * 1. SECTION DI BAWAH LAYAR - tetap dirender di server (`ssr` dibiarkan
 *    menyala). Isinya wajib ada di HTML sumber untuk mesin pencari dan
 *    pembaca layar; yang ditunda hanya JavaScript-nya, sehingga hidrasi
 *    tidak lagi menahan halaman sejak detik pertama.
 *
 * 2. MODAL DAN WIDGET - `ssr: false`. Keduanya bukan konten: modal baru ada
 *    setelah tombol ditekan, widget aksesibilitas mengambang di atas
 *    halaman. Merendernya di server tidak memberi apa pun.
 *
 * Yang membuat ini berdampak besar: kedua modal memakai react-hook-form dan
 * skema Zod. Sebelumnya keduanya ikut terkirim di muatan pertama halaman
 * depan - sekitar 220 KB JavaScript untuk formulir yang mungkin tidak pernah
 * dibuka pengunjung.
 */

const InclusivitySection = dynamic(() => import("@/components/sections/InclusivitySection"));
const SpecialServicesSection = dynamic(() => import("@/components/sections/SpecialServicesSection"));
const VidconSection = dynamic(() => import("@/components/sections/VidconSection"));
const DocumentationSection = dynamic(() => import("@/components/sections/DocumentationSection"));
const ZeroRupiahSection = dynamic(() => import("@/components/sections/ZeroRupiahSection"));
const FaqSection = dynamic(() => import("@/components/sections/FaqSection"));
const ContactSection = dynamic(() => import("@/components/sections/ContactSection"));

const VidconModal = dynamic(() => import("@/components/modals/VidconModal"), { ssr: false });
const PengaduanModal = dynamic(() => import("@/components/modals/PengaduanModal"), { ssr: false });
const PermintaanDataModal = dynamic(() => import("@/components/modals/PermintaanDataModal"), {
  ssr: false,
});
const AccessibilityWidget = dynamic(() => import("@/components/AccessibilityWidget"), {
  ssr: false,
});

export interface KontenLanding {
  pengaturan: Pengaturan;
  testimoni: Testimonial[];
  faq: Faq[];
  tampilTestimoni: boolean;
  tampilFaq: boolean;
  tampilPeta: boolean;
  tampilInklusi: boolean;
  googleMapsKey: string;
  /** Tahun berjalan WIB, untuk label Survei Kebutuhan Data. */
  tahunSkd: number;
}

/**
 * Pemegang state modal untuk halaman utama.
 *
 * Isi halaman diambil di src/app/page.tsx (Server Component) lalu dioper ke
 * sini sebagai props. Pemisahan ini yang membuat konten tetap ada di HTML
 * sumber - penting untuk mesin pencari dan pembaca layar - sementara modal
 * tetap bisa dibuka-tutup di sisi klien.
 */
export default function HomeClient({ konten }: { konten: KontenLanding }) {
  const [vidconOpen, setVidconOpen] = useState(false);
  const [pengaduanOpen, setPengaduanOpen] = useState(false);
  const [permintaanDataOpen, setPermintaanDataOpen] = useState(false);

  const { pengaturan } = konten;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className="flex-grow">
        <HeroSection
          onOpenVidcon={() => setVidconOpen(true)}
          onOpenPengaduan={() => setPengaduanOpen(true)}
        />
        <ServicesSection
          onOpenVidcon={() => setVidconOpen(true)}
          onOpenPengaduan={() => setPengaduanOpen(true)}
          onOpenPermintaanData={() => setPermintaanDataOpen(true)}
        />
        {konten.tampilInklusi && <InclusivitySection />}
        <SpecialServicesSection tahunSkd={konten.tahunSkd} />
        <VidconSection onOpenVidcon={() => setVidconOpen(true)} />
        {konten.tampilTestimoni && konten.testimoni.length > 0 && (
          <DocumentationSection testimoni={konten.testimoni} />
        )}
        <ZeroRupiahSection />
        {konten.tampilFaq && konten.faq.length > 0 && <FaqSection faq={konten.faq} />}
        <ContactSection
          onOpenPengaduan={() => setPengaduanOpen(true)}
          pengaturan={pengaturan}
          tampilPeta={konten.tampilPeta}
          googleMapsKey={konten.googleMapsKey}
        />
      </main>

      <AccessibilityWidget />
      <Footer />

      {/*
        Dipasang hanya saat terbuka, bukan sekadar disembunyikan.
        Keduanya memang sudah `return null` saat tertutup, tapi dengan
        dirender tanpa syarat, Next tetap mengambil berkas JavaScript-nya
        begitu halaman selesai dimuat. Syarat di sini yang menahannya sampai
        tombolnya benar-benar ditekan.
      */}
      {vidconOpen && <VidconModal isOpen onClose={() => setVidconOpen(false)} />}
      {permintaanDataOpen && (
        <PermintaanDataModal isOpen onClose={() => setPermintaanDataOpen(false)} />
      )}
      {pengaduanOpen && (
        <PengaduanModal
          isOpen
          onClose={() => setPengaduanOpen(false)}
          istilah={{
            tab: pengaturan["istilah.aduan_tab"],
            sukses: pengaturan["istilah.aduan_sukses"],
          }}
        />
      )}
    </div>
  );
}
