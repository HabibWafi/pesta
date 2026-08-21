"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contactSchema, type ContactFormData } from "@/lib/schemas/contact";
import PetaLokasi from "@/components/ui/PetaLokasi";
import type { Pengaturan } from "@/lib/content";
import { 
  Send, 
  MapPin, 
  Mail, 
  Phone, 
  Clock, 
  ShieldAlert, 
  ExternalLink, 
  Building2, 
  AlertTriangle,
  ArrowRight
} from "lucide-react";

interface ContactSectionProps {
  onOpenPengaduan?: () => void;
  pengaturan: Pengaturan;
  tampilPeta: boolean;
  googleMapsKey: string;
}

export default function ContactSection({
  onOpenPengaduan,
  pengaturan,
  tampilPeta,
  googleMapsKey,
}: ContactSectionProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim pesan");
      }

      toast.success("Pesan Anda Berhasil Terkirim!", {
        description: `Terima kasih Sdr/i ${data.nama}. Tim BPS Musi Rawas akan merespon via email ${data.email}.`,
      });
      reset();
    } catch (err: any) {
      toast.error("Gagal Mengirim Pesan", {
        description: err.message || "Terjadi kendala jaringan.",
      });
    }
  };

  return (
    <section id="kontak" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
            Pusat Kontak & Pengaduan Official
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Hubungi BPS Kabupaten Musi Rawas
          </h2>
          <p className="mt-3 text-slate-600 text-sm">
            Kunjungi Pelayanan Statistik Terpadu (PST), sampaikan pertanyaan, atau akses kanal pengaduan resmi pemerintah.
          </p>
        </div>

        {/* 3 Official Complaint Channels Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Kanal 1: Form Aduan internal PESTA */}
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 font-bold text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  {pengaturan["istilah.aduan_kartu"]}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Internal BPS
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{pengaturan["istilah.aduan_judul"]}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Laporan langsung yang ditindaklanjuti oleh Staf Pengawas BPS Kabupaten Musi Rawas secara rahasia.
              </p>
            </div>

            <button
              onClick={onOpenPengaduan}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 pt-1 text-left"
            >
              <span>{pengaturan["istilah.aduan_tombol"]}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Channel 2: SP4N-LAPOR! */}
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  SP4N-LAPOR!
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Nasional
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Laporan Publik Nasional</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kanal resmi pengaduan publik pemerintah RI yang terhubung dengan Ombudsman & KSP.
              </p>
            </div>

            <a
              href="https://www.lapor.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 pt-1"
            >
              <span>Akses lapor.go.id</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Channel 3: WBS BPS RI */}
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  WBS BPS RI
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Pelanggaran & Fraud
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Whistleblowing System BPS</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kanal khusus pelaporan indikasi korupsi, kecurangan, atau pelanggaran etik pegawai BPS.
              </p>
            </div>

            <a
              href="https://webapps.bps.go.id/pengaduan/wbs/beranda"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 pt-1"
            >
              <span>Akses WBS BPS RI</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Office Details */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">
              Pelayanan Statistik Terpadu (PST)
            </h3>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Alamat Kantor</h4>
                  <p className="text-slate-600 mt-0.5">{pengaturan["kontak.alamat"]}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="p-2.5 rounded-xl bg-cyan-100 text-cyan-600 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Email Resmi</h4>
                  <p className="text-slate-600">{pengaturan["kontak.email"]}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Telepon Kantor</h4>
                  <p className="text-slate-600">{pengaturan["kontak.telepon"]}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Jam Layanan PST</h4>
                  <p className="text-slate-600 whitespace-pre-line">{pengaturan["kontak.jam_layanan"]}</p>
                </div>
              </div>

              {tampilPeta && (
                <PetaLokasi
                  lat={pengaturan["peta.lat"]}
                  lng={pengaturan["peta.lng"]}
                  zoom={pengaturan["peta.zoom"]}
                  judul={pengaturan["peta.judul"]}
                  jenis={pengaturan["peta.jenis"]}
                  googleKey={googleMapsKey}
                />
              )}
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="glass-card p-8 rounded-3xl border border-slate-200 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Kirim Pesan / Pertanyaan Cepat
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Isi formulir di bawah ini untuk mengirim pertanyaan langsung ke tim PST BPS Musi Rawas.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  {...register("nama")}
                  type="text"
                  placeholder="Masukkan nama Anda"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                {errors.nama && (
                  <p className="text-xs text-rose-500 mt-1">{errors.nama.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Email *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="nama@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                {errors.email && (
                  <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subjek Pesan *
                </label>
                <input
                  {...register("subjek")}
                  type="text"
                  placeholder="Contoh: Pertanyaan Metodologi Inflasi"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                {errors.subjek && (
                  <p className="text-xs text-rose-500 mt-1">{errors.subjek.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pesan Anda *
                </label>
                <textarea
                  {...register("pesan")}
                  rows={4}
                  placeholder="Tuliskan pertanyaan atau permohonan informasi Anda di sini..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                {errors.pesan && (
                  <p className="text-xs text-rose-500 mt-1">{errors.pesan.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Sending..." : "Kirim Pesan Sekarang"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
