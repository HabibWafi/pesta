"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  permintaanDataSchema,
  type PermintaanDataFormData,
  FORMAT_DATA,
  FORMAT_DATA_LABEL,
  LAMPIRAN_EKSTENSI,
  LAMPIRAN_MAKS_BYTE,
  lampiranValid,
} from "@/lib/schemas/permintaan-data";
import { X, Database, User, Building, Mail, Phone, FileText, CheckCircle2, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PermintaanDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PermintaanDataModal({ isOpen, onClose }: PermintaanDataModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PermintaanDataFormData>({
    resolver: zodResolver(permintaanDataSchema),
    defaultValues: { formatDiinginkan: "SOFT_FILE" },
  });

  // Lampiran di luar react-hook-form/Zod - File tidak berguna divalidasi
  // lewat skema domain yang sama dengan alur WhatsApp (yang tidak pernah
  // punya lampiran sama sekali). Divalidasi terpisah, ringan, sekadar
  // kenyamanan; yang menentukan tetap pemeriksaan di server.
  //
  // Input berkas tidak punya `value` terkendali di React - satu-satunya
  // cara mengosongkannya lagi adalah memasang ulang elemennya. `resetKey`
  // yang berubah memaksa React membuang elemen lama dan memasang yang
  // baru, tanpa perlu menyentuh ref sama sekali.
  const [resetKey, setResetKey] = useState(0);
  const [lampiran, setLampiran] = useState<File | null>(null);
  const [galatLampiran, setGalatLampiran] = useState<string | null>(null);

  const pilihLampiran = (e: React.ChangeEvent<HTMLInputElement>) => {
    const berkas = e.target.files?.[0] ?? null;
    if (!berkas) {
      setLampiran(null);
      setGalatLampiran(null);
      return;
    }
    const cek = lampiranValid(berkas.name, berkas.size);
    if (!cek.ok) {
      setGalatLampiran(cek.pesan);
      setLampiran(null);
      setResetKey((k) => k + 1);
      return;
    }
    setGalatLampiran(null);
    setLampiran(berkas);
  };

  const hapusLampiran = () => {
    setLampiran(null);
    setGalatLampiran(null);
    setResetKey((k) => k + 1);
  };

  const onSubmit = async (data: PermintaanDataFormData) => {
    try {
      const formData = new FormData();
      formData.append("nama", data.nama);
      formData.append("instansi", data.instansi);
      formData.append("alamat", data.alamat);
      formData.append("noHp", data.noHp);
      formData.append("email", data.email);
      formData.append("jenisData", data.jenisData);
      formData.append("keperluan", data.keperluan);
      formData.append("formatDiinginkan", data.formatDiinginkan ?? "SOFT_FILE");
      if (data.catatan) formData.append("catatan", data.catatan);
      if (lampiran) formData.append("lampiran", lampiran);

      const res = await fetch("/api/permintaan-data", { method: "POST", body: formData });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim permintaan data");
      }

      toast.success("Permintaan Data Berhasil Terkirim!", {
        description: `Halo ${data.nama}, permintaan data Anda sudah masuk ke sistem BPS Musi Rawas. Petugas akan menghubungi Anda lewat email/WhatsApp.`,
      });
      reset();
      hapusLampiran();
      onClose();
    } catch (err) {
      toast.error("Gagal Mengirim Permintaan Data", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
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
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-400/30">
              <Database className="w-3.5 h-3.5" />
              Permohonan Data Official
            </div>
            <h3 className="text-2xl font-bold">Permintaan Data Statistik</h3>
            <p className="text-xs text-slate-300 mt-1">
              Butuh data spesifik yang belum tersedia di publikasi? Ajukan langsung ke petugas PST BPS Musi Rawas.
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Nama Lengkap Pemohon *
                </label>
                <input
                  {...register("nama")}
                  type="text"
                  placeholder="Contoh: Ahmad Subagyo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
                {errors.nama && <p className="text-xs text-rose-500 mt-1">{errors.nama.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" /> Asal Instansi / Perusahaan *
                </label>
                <input
                  {...register("instansi")}
                  type="text"
                  placeholder="Bappeda / Universitas / Pribadi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
                {errors.instansi && <p className="text-xs text-rose-500 mt-1">{errors.instansi.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Pemohon *</label>
              <input
                {...register("alamat")}
                type="text"
                placeholder="Alamat domisili / alamat kantor"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
              {errors.alamat && <p className="text-xs text-rose-500 mt-1">{errors.alamat.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" /> Nomor HP / WhatsApp *
                </label>
                <input
                  {...register("noHp")}
                  type="text"
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
                {errors.noHp && <p className="text-xs text-rose-500 mt-1">{errors.noHp.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> Alamat Email *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
                {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Data / Tabel yang Dibutuhkan *
              </label>
              <input
                {...register("jenisData")}
                type="text"
                placeholder="Contoh: Data PDRB per kecamatan tahun 2023"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
              {errors.jenisData && <p className="text-xs text-rose-500 mt-1">{errors.jenisData.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keperluan Penggunaan Data *
              </label>
              <textarea
                {...register("keperluan")}
                rows={3}
                placeholder="Untuk apa data ini akan digunakan? Mis. penelitian, penyusunan dokumen perencanaan, tugas akhir..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
              {errors.keperluan && <p className="text-xs text-rose-500 mt-1">{errors.keperluan.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format Data yang Diinginkan *
              </label>
              <select
                {...register("formatDiinginkan")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              >
                {FORMAT_DATA.map((nilai) => (
                  <option key={nilai} value={nilai}>
                    {FORMAT_DATA_LABEL[nilai]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Tambahan (opsional)
              </label>
              <textarea
                {...register("catatan")}
                rows={2}
                placeholder="Rincian tambahan bila diperlukan..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
              {errors.catatan && <p className="text-xs text-rose-500 mt-1">{errors.catatan.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" /> Lampiran Pendukung (opsional)
              </label>
              <input
                key={resetKey}
                type="file"
                accept={LAMPIRAN_EKSTENSI.join(",")}
                onChange={pilihLampiran}
                className="w-full text-xs text-slate-600 file:mr-3 file:px-3.5 file:py-2 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold file:text-xs hover:file:bg-blue-100"
              />
              {lampiran && (
                <div className="mt-1.5 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-[11px] text-blue-800 truncate">
                    {lampiran.name} ({(lampiran.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={hapusLampiran}
                    className="text-[11px] text-rose-500 font-semibold shrink-0 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              )}
              {galatLampiran ? (
                <p className="text-xs text-rose-500 mt-1">{galatLampiran}</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">
                  Format {LAMPIRAN_EKSTENSI.join(", ")} - maksimal {LAMPIRAN_MAKS_BYTE / (1024 * 1024)} MB.
                  Mis. contoh format tabel, daftar variabel, atau surat pengantar instansi.
                </p>
              )}
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
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Mengirim..." : "Kirim Permintaan Data"}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
