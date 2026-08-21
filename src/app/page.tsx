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

export default function Home() {
  const [vidconOpen, setVidconOpen] = useState(false);
  const [pengaduanOpen, setPengaduanOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-indigo-500 selection:text-white">
      {/* Clean Glassmorphic Navbar */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="flex-grow">
        <HeroSection
          onOpenVidcon={() => setVidconOpen(true)}
          onOpenPengaduan={() => setPengaduanOpen(true)}
        />
        <ServicesSection
          onOpenVidcon={() => setVidconOpen(true)}
          onOpenPengaduan={() => setPengaduanOpen(true)}
        />
        <InclusivitySection />
        <SpecialServicesSection />
        <VidconSection onOpenVidcon={() => setVidconOpen(true)} />
        <DocumentationSection />
        <ZeroRupiahSection />
        <FaqSection />
        <ContactSection onOpenPengaduan={() => setPengaduanOpen(true)} />
      </main>

      {/* Floating Inclusivity & Accessibility Widget */}
      <AccessibilityWidget />

      {/* Modern Footer */}
      <Footer />

      {/* Interactive System Modals */}
      <VidconModal
        isOpen={vidconOpen}
        onClose={() => setVidconOpen(false)}
      />

      <PengaduanModal
        isOpen={pengaduanOpen}
        onClose={() => setPengaduanOpen(false)}
      />
    </div>
  );
}
