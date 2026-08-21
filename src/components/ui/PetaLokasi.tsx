"use client";

import { useState } from "react";
import { MapPin, ExternalLink, Navigation, Map as MapIcon } from "lucide-react";

interface PetaLokasiProps {
  lat: string;
  lng: string;
  zoom: string;
  judul: string;
  /** "google" | "osm" - dipilih dari /admin/konten */
  jenis: string;
  /** Kosong berarti Google Hybrid tidak tersedia; otomatis jatuh ke OSM. */
  googleKey?: string;
}

/**
 * Peta lokasi kantor.
 *
 * Dua hal yang disengaja:
 *
 * 1. KLIK UNTUK MEMUAT. Peta baru dimuat setelah pengunjung mengklik.
 *    Tanpa ini, setiap kunjungan halaman utama akan memuat sumber daya
 *    Google beserta cookie-nya, padahal sebagian besar pengunjung tidak
 *    membuka peta sama sekali.
 *
 * 2. JATUH KE OSM. Bila API key Google tidak diisi atau dicabut, peta
 *    beralih ke OpenStreetMap alih-alih menjadi kotak error di halaman
 *    publik.
 *
 * Alamat teks tetap ditampilkan di sebelahnya - peta tidak boleh jadi
 * satu-satunya cara mengetahui lokasi kantor.
 */
export default function PetaLokasi({
  lat,
  lng,
  zoom,
  judul,
  jenis,
  googleKey,
}: PetaLokasiProps) {
  const [dimuat, setDimuat] = useState(false);

  const pakaiGoogle = jenis === "google" && Boolean(googleKey);

  const sumberPeta = pakaiGoogle
    ? `https://www.google.com/maps/embed/v1/place?key=${googleKey}` +
      `&q=${lat},${lng}&maptype=satellite&zoom=${zoom}`
    : `https://www.openstreetmap.org/export/embed.html` +
      `?bbox=${Number(lng) - 0.004}%2C${Number(lat) - 0.003}%2C` +
      `${Number(lng) + 0.004}%2C${Number(lat) + 0.003}` +
      `&layer=mapnik&marker=${lat}%2C${lng}`;

  const tautanGoogle = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const tautanArah = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
      <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-slate-100">
        {dimuat ? (
          <iframe
            src={sumberPeta}
            title={`Peta lokasi ${judul}`}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setDimuat(true)}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40"
          >
            <span className="p-3 rounded-2xl bg-indigo-100 text-indigo-600">
              <MapIcon className="w-7 h-7" />
            </span>
            <span className="font-bold text-sm text-slate-900">Tampilkan peta lokasi</span>
            <span className="text-[11px] text-slate-500 px-6 text-center">
              Peta dimuat hanya bila Anda menekan tombol ini.
            </span>
          </button>
        )}
      </div>

      <div className="p-3 flex flex-wrap items-center justify-between gap-2 bg-white border-t border-slate-200">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          {judul}
          <span className="text-slate-400 font-normal">
            &middot; {pakaiGoogle ? "Google" : "OpenStreetMap"}
          </span>
        </p>

        <div className="flex items-center gap-2">
          <a
            href={tautanArah}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
            Petunjuk Arah
          </a>
          <a
            href={tautanGoogle}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition-colors"
          >
            Buka di Google Maps
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
