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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-stretch">
          {/* Kolom kiri: informasi kantor + peta */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-slate-900">
              Pelayanan Statistik Terpadu (PST)
            </h3>

            {/*
              Satu kartu ringkas, bukan empat kartu bertumpuk. Versi lama
              membuat kolom kiri jauh lebih tinggi daripada formulir di
              sebelahnya, sehingga barisnya terlihat pincang.
            */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 divide-y divide-slate-200/80 text-sm">
              <div className="flex items-start gap-3 p-3.5">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-xs">Alamat Kantor</p>
                  <p className="text-slate-600 text-[13px] leading-snug mt-0.5">
                    {pengaturan["kontak.alamat"]}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
                <a
                  href={`mailto:${pengaturan["kontak.email"]}`}
                  className="flex items-start gap-3 p-3.5 hover:bg-slate-100/70 transition-colors"
                >
                  <Mail className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs">Email Resmi</p>
                    <p className="text-slate-600 text-[13px] truncate">{pengaturan["kontak.email"]}</p>
                  </div>
                </a>

                <a
                  href={`tel:${pengaturan["kontak.telepon"].replace(/[^0-9+]/g, "")}`}
                  className="flex items-start gap-3 p-3.5 hover:bg-slate-100/70 transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs">Telepon Kantor</p>
                    <p className="text-slate-600 text-[13px] truncate">{pengaturan["kontak.telepon"]}</p>
                  </div>
                </a>
              </div>

              <div className="flex items-start gap-3 p-3.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-xs">Jam Layanan PST</p>
                  <p className="text-slate-600 text-[13px] leading-snug whitespace-pre-line mt-0.5">
                    {pengaturan["kontak.jam_layanan"]}
                  </p>
                </div>
              </div>
            </div>

            {tampilPeta && (
              <div className="flex-1 min-h-[200px]">
                <PetaLokasi
                  lat={pengaturan["peta.lat"]}
                  lng={pengaturan["peta.lng"]}
                  zoom={pengaturan["peta.zoom"]}
                  judul={pengaturan["peta.judul"]}
                  jenis={pengaturan["peta.jenis"]}
                  googleKey={googleMapsKey}
                />
              </div>
            )}
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
