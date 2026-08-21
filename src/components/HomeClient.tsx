"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import ServicesSection from "@/components/sections/ServicesSection";
import SpecialServicesSection from "@/components/sections/SpecialServicesSection";
import InclusivitySection from "@/components/sections/InclusivitySection";
import VidconSection from "@/components/sections/VidconSection";
import DocumentationSection from "@/components/sections/DocumentationSection";
import ZeroRupiahSection from "@/components/sections/ZeroRupiahSection";
import FaqSection from "@/components/sections/FaqSection";
import ContactSection from "@/components/sections/ContactSection";
import Footer from "@/components/layout/Footer";
import VidconModal from "@/components/modals/VidconModal";
import PengaduanModal from "@/components/modals/PengaduanModal";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import type { Faq, Testimonial } from "@/lib/db/schema";
import type { Pengaturan } from "@/lib/content";

export interface KontenLanding {
  pengaturan: Pengaturan;
  testimoni: Testimonial[];
  faq: Faq[];
  tampilTestimoni: boolean;
  tampilFaq: boolean;
  tampilPeta: boolean;
  tampilInklusi: boolean;
  googleMapsKey: string;
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
        />
        {konten.tampilInklusi && <InclusivitySection />}
        <SpecialServicesSection />
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

      <VidconModal isOpen={vidconOpen} onClose={() => setVidconOpen(false)} />
      <PengaduanModal
        isOpen={pengaduanOpen}
        onClose={() => setPengaduanOpen(false)}
        istilah={{
          tab: pengaturan["istilah.aduan_tab"],
          sukses: pengaturan["istilah.aduan_sukses"],
        }}
      />
    </div>
  );
}
