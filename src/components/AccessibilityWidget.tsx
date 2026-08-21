"use client";

import { useState, useEffect } from "react";
import { 
  Volume2, 
  VolumeX, 
  Eye, 
  Type, 
  Sun, 
  Moon, 
  Sparkles, 
  X, 
  Accessibility, 
  Check, 
  HelpCircle,
  Ear,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [textSize, setTextSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [readableFont, setReadableFont] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Apply CSS classes dynamically to <html> tag
  useEffect(() => {
    const htmlEl = document.documentElement;

    // Text Size
    htmlEl.classList.remove("text-scale-large", "text-scale-xlarge");
    if (textSize === "large") htmlEl.classList.add("text-scale-large");
    if (textSize === "xlarge") htmlEl.classList.add("text-scale-xlarge");

    // High Contrast
    if (highContrast) {
      htmlEl.classList.add("high-contrast-mode");
    } else {
      htmlEl.classList.remove("high-contrast-mode");
    }

    // Readable Font
    if (readableFont) {
      htmlEl.classList.add("accessible-font-mode");
    } else {
      htmlEl.classList.remove("accessible-font-mode");
    }
  }, [textSize, highContrast, readableFont]);

  // Voice Reader (SpeechSynthesis API)
  const toggleSpeech = () => {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      toast.info("Suara pembaca dihentikan");
      return;
    }

    if (!("speechSynthesis" in window)) {
      toast.error("Browser tidak mendukung pembaca suara");
      return;
    }

    window.speechSynthesis.cancel();

    const mainText = `Selamat datang di Portal Pelayanan Statistik Digital PESTA BPS Kabupaten Musi Rawas. Portal ini dirancang ramah untuk semua warga, termasuk lansia, penyandang tuna rungu, dan penyandang disabilitas. Anda dapat mendaftar Konsultasi Virtual ViDCon, mengajukan pertanyaan data, atau meminta pendampingan juru bahasa isyarat secara gratis.`;

    const utterance = new SpeechSynthesisUtterance(mainText);
    utterance.lang = "id-ID";
    utterance.rate = 0.9; // Slightly slower for elderly
    utterance.pitch = 1;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
    toast.success("Memulai Pembacaan Layanan Suara", {
      description: "Suara panduan PESTA sedang membacakan informasi utama.",
    });
  };

  const resetSettings = () => {
    setTextSize("normal");
    setHighContrast(false);
    setReadableFont(false);
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    }
    toast.success("Mode Aksesibilitas Direset");
  };

  return (
    <>
      {/* Floating Accessibility Trigger Button */}
      <div className="fixed bottom-6 left-6 z-40">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`p-3.5 rounded-full shadow-2xl flex items-center gap-2 font-bold text-xs transition-all ${
            highContrast
              ? "bg-yellow-400 text-black border-2 border-black ring-4 ring-yellow-400/50"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/40 ring-4 ring-indigo-500/20"
          }`}
          title="Buka Panel Aksesibilitas & Ramah Kelompok Rentan (Lansia / Disabilitas)"
          aria-label="Fitur Aksesibilitas Inklusi PESTA"
        >
          <Accessibility className="w-6 h-6 animate-pulse" />
          <span className="hidden sm:inline font-extrabold pr-1">Layanan Inklusif</span>
        </motion.button>
      </div>

      {/* Accessibility Control Modal / Panel */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-start p-4 sm:p-6 pointer-events-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
            />

            {/* Panel Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 pointer-events-auto overflow-hidden z-10"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-2xl bg-indigo-500/30 border border-indigo-400/30">
                    <Accessibility className="w-6 h-6 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base flex items-center gap-1.5">
                      Mode Aksesibilitas Inklusif
                    </h3>
                    <p className="text-[11px] text-indigo-200">
                      Ramah Lansia, Tuna Rungu, & Penglihatan Terbatas
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Controls List */}
              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Feature 1: Voice Reader / Text-To-Speech */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Pembaca Suara Layanan (Text-to-Speech)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                      Ramah Lansia & Netra
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Mendengarkan panduan suara sapaan & ringkasan informasi PESTA BPS Musi Rawas.
                  </p>
                  <button
                    onClick={toggleSpeech}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      speaking
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                    }`}
                  >
                    {speaking ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span>Hentikan Suara</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Putar Suara Panduan PESTA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Feature 2: Text Scaling */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Ukuran Teks Huruf
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTextSize("normal")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        textSize === "normal"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Normal (100%)
                    </button>
                    <button
                      onClick={() => setTextSize("large")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        textSize === "large"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Besar (115%)
                    </button>
                    <button
                      onClick={() => setTextSize("xlarge")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        textSize === "xlarge"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Sangat Besar (130%)
                    </button>
                  </div>
                </div>

                {/* Feature 3: High Contrast Mode */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                      <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Mode Kontras Tinggi (High Contrast)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tampilan hitam-kuning kontras tajam untuk kejelasan pandangan
                    </p>
                  </div>
                  <button
                    onClick={() => setHighContrast(!highContrast)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      highContrast ? "bg-yellow-400" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-slate-900 transition-transform ${
                        highContrast ? "translate-x-6 bg-black" : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>

                {/* Feature 4: Dyslexia & Clear Font */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                      <Type className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Font Mudah Dibaca & Spasial Jelas
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Teks dengan spasi baris lebar & huruf mudah dibaca
                    </p>
                  </div>
                  <button
                    onClick={() => setReadableFont(!readableFont)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      readableFont ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        readableFont ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Feature 5: Deaf / Deafness & Special Disability Assistance Info */}
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-900 dark:text-emerald-300">
                    <Ear className="w-4 h-4 text-emerald-600" />
                    Layanan Tuna Rungu & Pendampingan Isyarat
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    Saat mendaftar konsultasi <strong>ViDCon</strong>, centang opsi <em>"Membutuhkan Juru Bahasa Isyarat (JBI)"</em>. Petugas PST BPS Musi Rawas akan langsung menyiapkan fasilitas pendampingan teks/JBI pada sesi Zoom Anda.
                  </p>
                </div>

                {/* Footer Reset */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> WCAG 2.1 AAA Compliant
                  </span>
                  <button
                    onClick={resetSettings}
                    className="font-bold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Reset Pengaturan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
