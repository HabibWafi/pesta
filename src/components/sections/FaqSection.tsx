"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import type { Faq } from "@/lib/db/schema";

interface FaqSectionProps {
  faq: Faq[];
}

export default function FaqSection({ faq }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-slate-50 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-3">
            <HelpCircle className="w-4 h-4" />
            Pusat Informasi
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions (FAQ)
          </h2>
          <p className="mt-3 text-slate-600 text-sm">
            Jawaban lengkap atas pertanyaan yang sering diajukan mengenai pelayanan statistik digital BPS Musi Rawas.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faq.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-white border-indigo-200 shadow-md shadow-indigo-500/5"
                    : "bg-white/80 border-slate-200 hover:border-slate-300"
                }`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span className="font-bold text-slate-900 text-base sm:text-lg pr-4">
                    {item.pertanyaan}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen ? "bg-indigo-600 text-white rotate-180" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/*
                  Buka-tutup dengan grid, bukan JavaScript.
                  Tinggi "auto" tidak bisa dianimasikan langsung oleh CSS,
                  tetapi `grid-template-rows` dari 0fr ke 1fr bisa - dan
                  hasilnya identik tanpa memuat pustaka animasi apa pun.
                  Jawabannya tetap ada di HTML sumber sehingga terbaca mesin
                  pencari, dan `aria-hidden` menahannya dari pembaca layar
                  selama masih tertutup.
                */}
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                  aria-hidden={!isOpen}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                      {item.jawaban}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
