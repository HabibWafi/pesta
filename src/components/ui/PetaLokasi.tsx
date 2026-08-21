"use client";

import { MapPin, ExternalLink, Navigation } from "lucide-react";

interface PetaLokasiProps {
  lat: string;
  lng: string;
  zoom: string;
  judul: string;
  /** "google" | "osm" - dipilih dari /admin/konten */
  jenis: string;
  /** API key Maps Embed. Kosong pun peta Google tetap tampil (lihat catatan). */
  googleKey?: string;
}

/**
 * Peta lokasi kantor.
 *
 * TIGA JALUR, dipilih otomatis:
 *
 * 1. jenis "google" + ada API key -> Maps Embed API resmi. Gratis tanpa
 *    kuota, stabil, tapi key-nya harus dibuat di Google Cloud Console dan
 *    dibatasi HTTP referrer.
 *
 * 2. jenis "google" tanpa API key -> embed klasik `output=embed` dengan
 *    `t=h` (hybrid). Tampilannya sama seperti membuka Google Maps, dan
 *    tidak butuh key sama sekali.
 *    CATATAN JUJUR: jalur ini tidak didokumentasikan resmi oleh Google.
 *    Ia bekerja dan dipakai luas, tetapi Google bisa mengubahnya sewaktu-
 *    waktu tanpa pemberitahuan. Kalau suatu hari peta berhenti tampil,
 *    isi GOOGLE_MAPS_EMBED_KEY di .env - jalur 1 langsung dipakai tanpa
 *    perlu mengubah kode.
 *
 * 3. jenis "osm" -> OpenStreetMap. Tanpa key, tanpa pelacakan, tapi tanpa
 *    citra satelit.
 *
 * Peta dimuat langsung agar lokasi kantor terlihat tanpa perlu diklik.
 * Atribut loading="lazy" tetap dipakai sehingga pemuatannya ditunda sampai
 * peta mendekati layar - bagian atas halaman tidak ikut terbebani.
 *
 * Alamat teks tetap ada di sebelahnya: peta tidak boleh jadi satu-satunya
 * cara mengetahui lokasi kantor.
 */
export default function PetaLokasi({
  lat,
  lng,
  zoom,
  judul,
  jenis,
  googleKey,
}: PetaLokasiProps) {
  const pakaiGoogle = jenis !== "osm";
  const adaKey = Boolean(googleKey);

  let sumberPeta: string;
  let namaSumber: string;

  if (pakaiGoogle && adaKey) {
    // maptype=satellite pada Embed API sudah menyertakan label jalan,
    // yaitu tampilan yang biasa disebut "hybrid".
    sumberPeta =
      `https://www.google.com/maps/embed/v1/place?key=${googleKey}` +
      `&q=${lat},${lng}&maptype=satellite&zoom=${zoom}`;
    namaSumber = "Google Maps";
  } else if (pakaiGoogle) {
    // t=h -> hybrid (citra satelit + label jalan)
    sumberPeta =
      `https://maps.google.com/maps?q=${lat},${lng}` +
      `&t=h&z=${zoom}&hl=id&output=embed`;
    namaSumber = "Google Maps";
  } else {
    const d = 0.004;
    sumberPeta =
      `https://www.openstreetmap.org/export/embed.html` +
      `?bbox=${Number(lng) - d}%2C${Number(lat) - d * 0.75}%2C` +
      `${Number(lng) + d}%2C${Number(lat) + d * 0.75}` +
      `&layer=mapnik&marker=${lat}%2C${lng}`;
    namaSumber = "OpenStreetMap";
  }

  const tautanGoogle = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const tautanArah = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col h-full">
      {/* flex-1: peta menyerap sisa tinggi kolom, sehingga kedua kolom sejajar */}
      <div className="relative flex-1 min-h-[200px] bg-slate-100">
        <iframe
          src={sumberPeta}
          title={`Peta lokasi ${judul}`}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      <div className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-white border-t border-slate-200">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate">{judul}</span>
          <span className="text-slate-400 font-normal shrink-0">&middot; {namaSumber}</span>
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={tautanArah}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
            Petunjuk Arah
          </a>
          <a
            href={tautanGoogle}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition-colors"
          >
            Buka di Maps
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
