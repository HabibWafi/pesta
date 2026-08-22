"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { vidconSchema, type VidconFormData } from "@/lib/schemas/vidcon";
import { LAYANAN_INKLUSIF, LAYANAN_INKLUSIF_INFO } from "@/lib/schemas/inklusi";
import { X, Calendar, Clock, Video, User, Building, Mail, Phone, FileText, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VidconModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VidconModal({ isOpen, onClose }: VidconModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VidconFormData>({
    resolver: zodResolver(vidconSchema),
  });

  const onSubmit = async (data: VidconFormData) => {
    try {
      const res = await fetch("/api/vidcon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mendaftarkan ViDCon");
      }

      toast.success("Permohonan ViDCon Berhasil Didaftarkan!", {
        description: `Halo ${data.nama}, jadwal pada ${data.tanggal} jam ${data.jam} telah masuk ke sistem BPS Musi Rawas. Konfirmasi akan dikirim via Email/WhatsApp.`,
      });
      reset();
      onClose();
    } catch (err: any) {
      toast.error("Gagal Mendaftar ViDCon", {
        description: err.message || "Terjadi kendala jaringan.",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/*
        Wrapper INI cuma pintu gulung (overflow-y-auto), BUKAN flex
        pemusat. Memusatkan lewat items-center di sini adalah bug klasik:
        saat kartunya lebih tinggi dari layar (form panjang di HP), bagian
        ATAS kartu - termasuk tombol tutup - terdorong ke luar area yang
        bisa digulung, dan warga tidak akan pernah bisa menggulung ke atas
        untuk mencapainya. Pemusatan yang sesungguhnya dipindah ke wrapper
        di dalam (min-h-full), yang aman digulung dari mana saja karena ia
        sendiri bukan wadah gulir - wadah gulirnya tetap yang di luar.
      */}
      <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Pemusat sesungguhnya - aman digulung karena bukan dia wadah gulirnya. */}
        <div className="relative flex min-h-full items-center justify-center">
        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-3 border border-indigo-400/30">
              <Video className="w-3.5 h-3.5" />
              Formulir Pendaftaran ViDCon (0 Rp)
            </div>
            <h3 className="text-2xl font-bold">Konsultasi Virtual Data BPS</h3>
            <p className="text-xs text-slate-300 mt-1">
              Isi data di bawah ini untuk menjadwalkan konsultasi data online dengan Petugas PST BPS Musi Rawas.
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> Nama Lengkap Pemohon *
                </label>
                <input
                  {...register("nama")}
                  type="text"
                  placeholder="Contoh: Ahmad Subagyo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
                {errors.nama && (
                  <p className="text-xs text-rose-500 mt-1">{errors.nama.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600" /> Asal Instansi / Perusahaan *
                </label>
                <input
                  {...register("instansi")}
                  type="text"
                  placeholder="Bappeda / Universitas / Umum"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
                {errors.instansi && (
                  <p className="text-xs text-rose-500 mt-1">{errors.instansi.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Pemohon *
              </label>
              <input
                {...register("alamat")}
                type="text"
                placeholder="Alamat domisili / alamat kantor"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
              {errors.alamat && (
                <p className="text-xs text-rose-500 mt-1">{errors.alamat.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" /> Nomor HP / WhatsApp *
                </label>
                <input
                  {...register("noHp")}
                  type="text"
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
                {errors.noHp && (
                  <p className="text-xs text-rose-500 mt-1">{errors.noHp.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" /> Alamat Email *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
                {errors.email && (
                  <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cakupan / Topik Konsultasi *
              </label>
              <select
                {...register("topik")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              >
                <option value="">-- Pilih Topik Data Statistik --</option>
                <option value="Data Perekonomian & PDRB">Data Perekonomian & PDRB</option>
                <option value="Tingkat Inflasi Daerah">Tingkat Inflasi Daerah</option>
                <option value="Indeks Pembangunan Manusia (IPM)">Indeks Pembangunan Manusia (IPM)</option>
                <option value="Kependudukan & Ketenagakerjaan">Kependudukan & Ketenagakerjaan</option>
                <option value="Rekomendasi Statistik (ROMANTIK)">Rekomendasi Statistik (ROMANTIK)</option>
                <option value="Metodologi & Spasial">Metodologi Survei & Spasial Wilkerstat</option>
                <option value="Lainnya">Konsultasi Lainnya</option>
              </select>
              {errors.topik && (
                <p className="text-xs text-rose-500 mt-1">{errors.topik.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> Rincian Kebutuhan Konsultasi *
              </label>
              <textarea
                {...register("deskripsi")}
                rows={3}
                placeholder="Tuliskan secara singkat permohonan data atau pertanyaan yang ingin dikonsultasikan..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
              {errors.deskripsi && (
                <p className="text-xs text-rose-500 mt-1">{errors.deskripsi.message}</p>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 space-y-2">
              <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-extrabold">INKLUSI</span>
                Bantuan Aksesibilitas Khusus (Disabilitas / Lansia)
              </label>
              {/*
                register() TANPA cast `as any`. Cast itulah yang dulu
                membungkam TypeScript dan menyembunyikan bahwa field ini
                tidak terdaftar di skema, sehingga isian warga dibuang
                diam-diam oleh zodResolver sebelum sampai ke server.
              */}
              <select
                {...register("layananInklusif")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs font-medium"
              >
                {LAYANAN_INKLUSIF.map((nilai) => (
                  <option key={nilai} value={nilai}>
                    {LAYANAN_INKLUSIF_INFO[nilai].label}
                  </option>
                ))}
              </select>

              <input
                {...register("layananInklusifCatatan")}
                type="text"
                placeholder="Bila memilih 'Kebutuhan lain', jelaskan di sini (opsional)"
                className="w-full px-3.5 py-2 rounded-xl border border-indigo-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              />
              {errors.layananInklusifCatatan && (
                <p className="text-xs text-rose-500">{errors.layananInklusifCatatan.message}</p>
              )}

              <p className="text-[10px] text-indigo-700">
                *Petugas PST BPS Musi Rawas akan langsung menyiapkan fasilitas aksesibilitas prioritas sesuai kebutuhan Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Tanggal Konsultasi *
                </label>
                <input
                  {...register("tanggal")}
                  type="date"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
                {errors.tanggal && (
                  <p className="text-xs text-rose-500 mt-1">{errors.tanggal.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Jam Konsultasi *
                </label>
                <select
                  {...register("jam")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                >
                  <option value="">-- Pilih Jam (Senin - Jumat) --</option>
                  <option value="08:30">08:30 WIB</option>
                  <option value="09:30">09:30 WIB</option>
                  <option value="10:30">10:30 WIB</option>
                  <option value="13:30">13:30 WIB</option>
                  <option value="14:30">14:30 WIB</option>
                </select>
                {errors.jam && (
                  <p className="text-xs text-rose-500 mt-1">{errors.jam.message}</p>
                )}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Gratis (Nol Rupiah)</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Mendaftarkan..." : "Kirim Jadwal ViDCon"}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
