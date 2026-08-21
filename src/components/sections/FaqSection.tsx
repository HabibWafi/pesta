"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "Apakah layanan ViDCon (Virtual Consultation) ini berbayar?",
    answer: "Tidak. Seluruh layanan ViDCon merupakan bagian dari komitmen Layanan Nol Rupiah BPS Kabupaten Musi Rawas dan diberikan secara 100% GRATIS kepada seluruh pengguna data dan stakeholder.",
  },
  {
    question: "Apakah layanan ViDCon dapat diakses di luar jam kerja?",
    answer: "Permohonan pendaftaran jadwal ViDCon dapat diajukan kapan saja secara online (24/7). Namun, pelaksanaan sesi ViDCon bersama staf BPS berlangsung pada jam kerja resmi (Senin-Jumat, pukul 08.00 - 15.00 WIB).",
  },
  {
    question: "Apa saja topik yang dapat dikonsultasikan melalui ViDCon?",
    answer: "Pengguna data dapat mengkonsultasikan berbagai topik statistik, antara lain: rilis indikator makro (sosial, ekonomi, kependudukan, inflasi), penjelasan konsep & definisi variabel, rekomendasi statistik sektoral, metodologi sensus/survei, serta bimbingan tugas akhir/penelitian mahasiswa.",
  },
  {
    question: "Apakah layanan ViDCon khusus untuk instansi pemerintah saja?",
    answer: "Tidak. Layanan ViDCon terbuka luas untuk umum, termasuk OPD/instansi pemerintah, akademisi, mahasiswa, peneliti, pelaku usaha, wartawan, dan seluruh lapisan masyarakat.",
  },
  {
    question: "Berapa lama konfirmasi jadwal ViDCon diberikan?",
    answer: "Tim petugas BPS Kabupaten Musi Rawas akan melakukan verifikasi dan mengirimkan konfirmasi link Google Meet/Zoom via Email / WhatsApp maksimal 1x24 jam pada hari kerja.",
  },
];

export default function FaqSection() {
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
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
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
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen ? "bg-indigo-600 text-white rotate-180" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
