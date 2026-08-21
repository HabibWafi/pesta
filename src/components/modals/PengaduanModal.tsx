"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  X, 
  ShieldAlert, 
  User, 
  Mail, 
  FileText, 
  Send, 
  Lock, 
  ExternalLink,
  Building2,
  AlertTriangle,
  FileCheck,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const pengaduanSchema = z.object({
  nama: z.string().min(2, "Nama harus diisi"),
  kontak: z.string().min(5, "Kontak/Email harus diisi untuk konfirmasi"),
  kategori: z.string().min(1, "Pilih kategori pengaduan"),
  detail: z.string().min(15, "Uraian pengaduan minimal 15 karakter"),
});

type PengaduanFormData = z.infer<typeof pengaduanSchema>;

interface PengaduanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PengaduanModal({ isOpen, onClose }: PengaduanModalProps) {
  const [activeTab, setActiveTab] = useState<"mandiri" | "lapor" | "wbs">("mandiri");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PengaduanFormData>({
    resolver: zodResolver(pengaduanSchema),
  });

  const onSubmit = async (data: PengaduanFormData) => {
    try {
      const res = await fetch("/api/pengaduan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim pengaduan");
      }

      toast.success("Pengaduan Mandiri Berhasil Terkirim!", {
        description: `Laporan Anda telah diteruskan ke Staf Pengawas BPS Musi Rawas. Kerahasiaan identitas Anda terjamin.`,
      });
      reset();
      onClose();
    } catch (err: any) {
      toast.error("Gagal Mengirim Pengaduan", {
        description: err.message || "Terjadi kendala jaringan.",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-amber-200 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 text-xs font-bold mb-2 border border-amber-300/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              Kanal Layanan Pengaduan Resmi
            </div>
            <h3 className="text-xl font-bold">Layanan Pengaduan BPS Musi Rawas</h3>
            <p className="text-xs text-amber-100 mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Kerahasiaan pelapor dijamin 100% aman & rahasia
            </p>
          </div>

          {/* Tab Selector: 3 Official Complaint Channels */}
          <div className="p-4 bg-slate-100/80 border-b border-slate-200 grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveTab("mandiri")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === "mandiri"
                  ? "bg-white text-amber-800 shadow-md border border-amber-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Form PESTA</span>
            </button>

            <button
              onClick={() => setActiveTab("lapor")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === "lapor"
                  ? "bg-white text-rose-700 shadow-md border border-rose-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>SP4N-LAPOR!</span>
            </button>

            <button
              onClick={() => setActiveTab("wbs")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === "wbs"
                  ? "bg-white text-indigo-800 shadow-md border border-indigo-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>WBS BPS RI</span>
            </button>
          </div>

          {/* TAB 1: FORM PENGADUAN MANDIRI PESTA */}
          {activeTab === "mandiri" && (
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                Formulir pengaduan internal langsung yang akan ditindaklanjuti oleh Staf Pengawas BPS Kabupaten Musi Rawas.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-600" /> Nama Pelapor / Anonim *
                </label>
                <input
                  {...register("nama")}
                  type="text"
                  placeholder="Nama Anda atau ketik 'Anonim'"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                />
                {errors.nama && (
                  <p className="text-xs text-rose-500 mt-1">{errors.nama.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-600" /> Email / No. HP untuk Balasan *
                </label>
                <input
                  {...register("kontak")}
                  type="text"
                  placeholder="nama@email.com atau 0812xxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                />
                {errors.kontak && (
                  <p className="text-xs text-rose-500 mt-1">{errors.kontak.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Pengaduan *
                </label>
                <select
                  {...register("kategori")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                >
                  <option value="">-- Pilih Kategori Layanan --</option>
                  <option value="Pelayanan PST">Pelayanan Statistik Terpadu (PST)</option>
                  <option value="Layanan ViDCon">Layanan ViDCon Online</option>
                  <option value="Publikasi & Data">Kualitas Data & Publikasi</option>
                  <option value="Sarana & Prasarana">Fasilitas / Sarana Prasarana</option>
                  <option value="Lainnya">Pengaduan Lainnya</option>
                </select>
                {errors.kategori && (
                  <p className="text-xs text-rose-500 mt-1">{errors.kategori.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" /> Uraian Pengaduan / Masukan *
                </label>
                <textarea
                  {...register("detail")}
                  rows={3}
                  placeholder="Tuliskan dengan jelas kronologi, masukan, atau kendala pelayanan yang Anda alami..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                />
                {errors.detail && (
                  <p className="text-xs text-rose-500 mt-1">{errors.detail.message}</p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Mengirim..." : "Kirim Pengaduan"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SP4N-LAPOR! (NASIONAL) */}
          {activeTab === "lapor" && (
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                  <Building2 className="w-4 h-4" />
                  Portal SP4N-LAPOR! (Layanan Pengaduan Nasional)
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  Sistem Pengelolaan Pengaduan Pelayanan Publik Nasional (SP4N-LAPOR!) adalah kanal resmi pemerintah Republik Indonesia untuk menyampaikan aspirasi dan pengaduan layanan ke seluruh instansi/kementerian, termasuk BPS.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>Terhubung langsung dengan Kantor Staf Presiden (KSP), KemenPAN-RB, & Ombudsman RI.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>Laporan terverifikasi dan terpantau secara transparan secara nasional.</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="https://www.lapor.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all"
                >
                  <span>Buka Portal SP4N-LAPOR! (lapor.go.id)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: WBS (WHISTLEBLOWING SYSTEM BPS RI) */}
          {activeTab === "wbs" && (
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-indigo-700">
                  <AlertTriangle className="w-4 h-4" />
                  Whistleblowing System (WBS) BPS RI
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  Kanal khusus untuk melaporkan indikasi tindak pidana korupsi, kecurangan (fraud), gratifikasi, pemerasan, atau pelanggaran kode etik pegawai BPS secara rahasia.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Dikelola secara tertutup oleh Inspektorat Utama BPS RI.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Perlindungan penuh bagi pelapor (Whistleblower Protection).</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="https://webapps.bps.go.id/pengaduan/wbs/beranda"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all"
                >
                  <span>Akses Portal WBS BPS RI</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
