import Link from "next/link";
import Image from "next/image";
import { MapPin, Mail, Phone, Clock, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-white border border-slate-700 overflow-hidden shadow-md shadow-cyan-500/20 flex items-center justify-center p-0.5">
                <Image
                  src="/images/pesta_logo.png"
                  alt="Logo PESTA BPS Musi Rawas"
                  width={40}
                  height={40}
                  className="object-contain rounded-lg w-full h-full"
                />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white">
                  PESTA
                </span>
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 uppercase tracking-wider">
                  BPS
                </span>
                <p className="text-xs text-slate-400 font-medium">
                  Pelayanan Statistik Digital
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Inovasi pelayanan publik BPS Kabupaten Musi Rawas untuk memberikan konsultasi statistik dan akses data yang cepat, transparan, gratis, dan akuntabel.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Layanan Nol Rupiah (100% Gratis)
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Navigasi Layanan
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#hero" className="hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <span className="text-xs text-slate-600">›</span> Beranda
                </a>
              </li>
              <li>
                <a href="#layanan" className="hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <span className="text-xs text-slate-600">›</span> Permintaan Data Statistik
                </a>
              </li>
              <li>
                <a href="#vidcon" className="hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <span className="text-xs text-slate-600">›</span> Konsultasi ViDCon Online
                </a>
              </li>
              <li>
                <a href="#nol-rupiah" className="hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <span className="text-xs text-slate-600">›</span> Video Info Nol Rupiah
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <span className="text-xs text-slate-600">›</span> FAQ Layanan
                </a>
              </li>
            </ul>
          </div>

          {/* Operational Hours */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Jam Operasional ViDCon
            </h3>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <Clock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Senin - Jumat</p>
                  <p className="text-xs text-slate-400">08.00 - 15.00 WIB</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                *Pendaftaran ViDCon dapat diajukan kapan saja secara online dan akan dikonfirmasi pada jam kerja BPS.
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Kantor BPS Musi Rawas
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Jl. Pangeran Mohammad Amin, Komplek Perkantoran Agropolitan Muara Beliti, Musi Rawas, Sumatera Selatan
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>bps1605@bps.go.id</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>(0733) 4540056</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BPS Kabupaten Musi Rawas. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a
              href="https://musirawaskab.bps.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            >
              Portal BPS Musi Rawas
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://pst.bps.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            >
              PST BPS RI
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
