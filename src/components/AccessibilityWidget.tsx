"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Accessibility,
  AlignJustify,
  Ban,
  Bold,
  Contrast,
  Ear,
  Eye,
  EyeOff,
  Focus,
  Image as ImageIcon,
  Info,
  ListTree,
  Minus,
  MousePointer2,
  Move3d,
  PauseCircle,
  Plus,
  RotateCcw,
  Square,
  SunMoon,
  Type,
  Volume2,
  VolumeX,
  X,
  Link2,
  Heading,
  BookOpen,
  Check,
} from "lucide-react";
import {
  BAWAAN,
  PROFIL,
  baca,
  simpan,
  terapkan,
  type KunciProfil,
  type ModeWarna,
  type Pengaturan,
} from "@/lib/aksesibilitas";

/**
 * Panel mode aksesibilitas inklusif.
 *
 * Menggantikan versi lama yang hanya punya empat penyesuaian, dan tiga di
 * antaranya tidak benar-benar bekerja: pengaturannya hilang setiap pindah
 * halaman, pembaca suaranya membacakan satu paragraf promosi yang ditulis
 * tetap di kode alih-alih isi halaman, dan mode kontras tingginya memakai
 * `* !important` yang membuat logo serta seluruh ikon menghilang.
 *
 * Ketiganya diperbaiki di sini dan di src/lib/aksesibilitas.ts.
 */

interface StrukturHalaman {
  taraf: number;
  teks: string;
  id: string;
}

export default function AccessibilityWidget() {
  const [terbuka, setTerbuka] = useState(false);
  /**
   * Dibaca saat state pertama kali dibuat, bukan lewat useEffect.
   *
   * Aman karena komponen ini dimuat dengan `ssr: false` - tidak pernah
   * dirender di server, jadi tidak ada hasil server yang bisa berbeda dari
   * hasil peramban. Lewat useEffect justru menambah satu render tambahan
   * tanpa manfaat apa pun di sini.
   */
  const [p, setP] = useState<Pengaturan>(() =>
    typeof window === "undefined" ? BAWAAN : baca()
  );
  const [membaca, setMembaca] = useState(false);
  const [struktur, setStruktur] = useState<StrukturHalaman[] | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pemicuRef = useRef<HTMLButtonElement>(null);

  // Skrip inline di layout sudah menerapkan pengaturan tersimpan sebelum
  // render pertama, jadi tidak ada kedipan di sini - efek ini yang menjaga
  // DOM tetap selaras setiap kali pengunjung mengubah sesuatu.
  useEffect(() => {
    terapkan(p);
    simpan(p);
  }, [p]);

  // --- penunjuk baca: garis yang mengikuti kursor --------------------------
  useEffect(() => {
    if (!p.penunjukBaca) return;

    const garis = document.createElement("div");
    garis.className = "a11y-penunjuk-baca";
    garis.setAttribute("aria-hidden", "true");
    document.body.appendChild(garis);

    const gerak = (e: MouseEvent) => {
      garis.style.top = `${e.clientY}px`;
    };
    window.addEventListener("mousemove", gerak);

    return () => {
      window.removeEventListener("mousemove", gerak);
      garis.remove();
    };
  }, [p.penunjukBaca]);

  // --- tooltip teks alternatif gambar --------------------------------------
  //
  // Menyalin alt ke title supaya muncul saat kursor berhenti di atas gambar.
  // Nilai title asli disimpan agar bisa dikembalikan saat saklarnya dimatikan.
  useEffect(() => {
    if (!p.tooltipGambar) return;

    const gambar = Array.from(document.querySelectorAll<HTMLImageElement>("img[alt]"));
    const semula = new Map<HTMLImageElement, string | null>();

    for (const g of gambar) {
      if (!g.alt.trim()) continue;
      semula.set(g, g.getAttribute("title"));
      g.setAttribute("title", g.alt);
    }

    return () => {
      for (const [g, judul] of semula) {
        if (judul === null) g.removeAttribute("title");
        else g.setAttribute("title", judul);
      }
    };
  }, [p.tooltipGambar]);

  // --- Escape menutup panel, fokus dikembalikan ke tombol pemicu -----------
  useEffect(() => {
    if (!terbuka) return;

    const padaTombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTerbuka(false);
        pemicuRef.current?.focus();
      }
    };
    window.addEventListener("keydown", padaTombol);
    return () => window.removeEventListener("keydown", padaTombol);
  }, [terbuka]);

  // --- pembaca layar -------------------------------------------------------
  const hentikanBaca = useCallback(() => {
    window.speechSynthesis?.cancel();
    setMembaca(false);
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  /**
   * Membacakan ISI HALAMAN yang sedang dibuka.
   *
   * Versi lama membacakan satu paragraf promosi yang ditulis tetap di kode -
   * diberi label "pembaca untuk tuna netra", padahal pengunjung tuna netra
   * sama sekali tidak bisa mendengar isi halamannya.
   */
  const bacakanHalaman = () => {
    if (membaca) {
      hentikanBaca();
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert("Peramban ini belum mendukung pembaca suara.");
      return;
    }

    const utama = document.querySelector("main") ?? document.body;
    const teks = (utama as HTMLElement).innerText.replace(/\s+/g, " ").trim();

    if (!teks) return;

    window.speechSynthesis.cancel();

    // Dipecah per kalimat: SpeechSynthesis di beberapa peramban berhenti
    // sendiri pada teks yang sangat panjang, dan potongan pendek juga
    // membuat tombol "hentikan" terasa langsung berhenti.
    const kalimat = teks.match(/[^.!?]+[.!?]*/g) ?? [teks];
    let indeks = 0;

    const lanjut = () => {
      if (indeks >= kalimat.length) {
        setMembaca(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(kalimat[indeks].trim());
      u.lang = "id-ID";
      u.rate = 0.95;
      u.onend = () => {
        indeks += 1;
        lanjut();
      };
      u.onerror = () => setMembaca(false);
      window.speechSynthesis.speak(u);
    };

    setMembaca(true);
    lanjut();
  };

  // --- struktur halaman ----------------------------------------------------
  const bukaStruktur = () => {
    const judul = Array.from(
      document.querySelectorAll<HTMLElement>("main h1, main h2, main h3, main h4")
    );

    const daftar: StrukturHalaman[] = judul
      .map((el, i) => {
        if (!el.id) el.id = `a11y-judul-${i}`;
        return {
          taraf: Number(el.tagName.slice(1)),
          teks: (el.innerText || "").trim().slice(0, 90),
          id: el.id,
        };
      })
      .filter((j) => j.teks.length > 0);

    setStruktur(daftar);
  };

  const lompatKe = (id: string) => {
    setStruktur(null);
    setTerbuka(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // --- pembantu ------------------------------------------------------------
  const ubah = <K extends keyof Pengaturan>(kunci: K, nilai: Pengaturan[K]) =>
    setP((lama) => ({ ...lama, [kunci]: nilai }));

  const togglePro = (kunci: keyof Pengaturan) =>
    setP((lama) => ({ ...lama, [kunci]: !lama[kunci] }));

  const pakaiProfil = (kunci: KunciProfil) => {
    const profil = PROFIL.find((x) => x.kunci === kunci);
    if (!profil) return;

    if (!profilAktif(p, kunci)) {
      setP((lama) => ({ ...lama, ...profil.ubah }));
      return;
    }

    /*
     * Mematikan profil TIDAK boleh asal mengembalikan seluruh penyesuaiannya
     * ke bawaan.
     *
     * Beberapa profil berbagi penyesuaian yang sama - "Tunanetra" dan
     * "Keterbatasan Motorik" sama-sama menyalakan fokus tegas dan sorot
     * tautan. Sebelum diperbaiki, mematikan salah satunya ikut mematikan
     * milik yang lain: profil kedua mendadak berhenti aktif tanpa pernah
     * disentuh, dan sebagian penyesuaiannya tertinggal menyala tanpa ada
     * profil mana pun yang bisa mematikannya.
     *
     * Jadi untuk tiap penyesuaian: kalau masih ada profil lain yang aktif dan
     * membutuhkannya, ikuti nilai profil itu; kalau tidak ada, baru
     * dikembalikan ke bawaan.
     */
    const profilLain = PROFIL.filter(
      (x) => x.kunci !== kunci && profilAktif(p, x.kunci)
    );

    const kembali: Partial<Pengaturan> = {};
    for (const k of Object.keys(profil.ubah) as (keyof Pengaturan)[]) {
      const pemilikLain = profilLain.find((l) => k in l.ubah);
      (kembali[k] as Pengaturan[typeof k]) = pemilikLain
        ? (pemilikLain.ubah[k] as Pengaturan[typeof k])
        : BAWAAN[k];
    }

    setP((lama) => ({ ...lama, ...kembali }));
  };

  const resetSemua = () => {
    hentikanBaca();
    setP({ ...BAWAAN });
  };

  const jumlahAktif = hitungAktif(p);

  return (
    <>
      {/* Lompat ke konten - elemen pertama yang dijangkau Tab (WCAG 2.4.1) */}
      <a href="#hero" className="a11y-lewati">
        Lompat ke konten utama
      </a>

      {/* Tombol mengambang */}
      <div className="fixed bottom-6 left-6 z-40 a11y-panel">
        <button
          ref={pemicuRef}
          onClick={() => setTerbuka((v) => !v)}
          className="relative p-3.5 rounded-full shadow-2xl flex items-center gap-2 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/40 ring-4 ring-indigo-500/20 transition-transform duration-150 hover:scale-[1.06] active:scale-95"
          aria-label="Buka menu aksesibilitas"
          aria-expanded={terbuka}
        >
          <Accessibility className="w-6 h-6" />
          <span className="hidden sm:inline font-extrabold pr-1">Layanan Inklusif</span>
          {jumlahAktif > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-[10px] font-extrabold text-slate-900 flex items-center justify-center">
              {jumlahAktif}
            </span>
          )}
        </button>
      </div>

      {terbuka && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-start pointer-events-none a11y-panel">
          <div
            onClick={() => setTerbuka(false)}
            className="latar-masuk fixed inset-0 bg-slate-900/50 backdrop-blur-sm pointer-events-auto"
            aria-hidden="true"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-judul-panel"
            className="panel-masuk relative w-full max-w-md h-full bg-slate-50 shadow-2xl pointer-events-auto overflow-hidden z-10 flex flex-col"
          >
            {/* Kepala */}
            <div className="bg-indigo-700 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <h2 id="a11y-judul-panel" className="font-extrabold text-base flex items-center gap-2">
                <Accessibility className="w-5 h-5" />
                Menu Aksesibilitas
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={resetSemua}
                  className="p-2 rounded-full hover:bg-white/15"
                  aria-label="Kembalikan semua ke pengaturan awal"
                  title="Kembalikan semua ke pengaturan awal"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setTerbuka(false);
                    pemicuRef.current?.focus();
                  }}
                  className="p-2 rounded-full hover:bg-white/15"
                  aria-label="Tutup menu aksesibilitas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* --- Profil --- */}
              <Bagian judul="Profil Aksesibilitas">
                <div className="space-y-2">
                  {PROFIL.map((profil) => {
                    const aktif = profilAktif(p, profil.kunci);
                    return (
                      <button
                        key={profil.kunci}
                        onClick={() => pakaiProfil(profil.kunci)}
                        className={`w-full text-left p-3.5 rounded-2xl border flex items-start gap-3 transition-colors ${
                          aktif
                            ? "bg-indigo-50 border-indigo-300"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                        aria-pressed={aktif}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-900">{profil.nama}</div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {profil.keterangan}
                          </p>
                        </div>
                        {/*
                          Sama seperti ubin: keadaan profil ditandai TEKS,
                          bukan hanya posisi dan warna sakelar. Di mode
                          kontras, sakelar menyala dan mati berwarna sama
                          persis.
                        */}
                        <span className="shrink-0 flex flex-col items-center gap-1">
                          <span
                            className={`w-11 h-6 rounded-full p-1 transition-colors ${
                              aktif ? "bg-indigo-600" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                aktif ? "translate-x-5" : ""
                              }`}
                            />
                          </span>
                          <span className="text-[9px] font-extrabold uppercase tracking-wide">
                            {aktif ? "Aktif" : "Mati"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Bagian>

              {/* --- Penyesuaian teks --- */}
              <Bagian judul="Penyesuaian Teks">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Type className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-sm text-slate-900">Ukuran Teks</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => ubah("ukuranTeks", Math.max(100, p.ukuranTeks - 10))}
                      disabled={p.ukuranTeks <= 100}
                      className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                      aria-label="Kecilkan ukuran teks"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-extrabold text-lg text-slate-900 tabular-nums">
                      {p.ukuranTeks}%
                    </span>
                    <button
                      onClick={() => ubah("ukuranTeks", Math.min(160, p.ukuranTeks + 10))}
                      disabled={p.ukuranTeks >= 160}
                      className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                      aria-label="Besarkan ukuran teks"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Ubin
                    aktif={p.tebalTeks}
                    onClick={() => togglePro("tebalTeks")}
                    ikon={<Bold className="w-5 h-5" />}
                    label="Teks Tebal"
                  />
                  <Ubin
                    aktif={p.tinggiBaris}
                    onClick={() => togglePro("tinggiBaris")}
                    ikon={<AlignJustify className="w-5 h-5" />}
                    label="Jarak Baris"
                  />
                  <Ubin
                    aktif={p.jarakHuruf}
                    onClick={() => togglePro("jarakHuruf")}
                    ikon={<Move3d className="w-5 h-5" />}
                    label="Jarak Huruf"
                  />
                  <Ubin
                    aktif={p.fontDisleksia}
                    onClick={() => togglePro("fontDisleksia")}
                    ikon={<BookOpen className="w-5 h-5" />}
                    label="Font Disleksia"
                  />
                  <Ubin
                    aktif={p.sorotTautan}
                    onClick={() => togglePro("sorotTautan")}
                    ikon={<Link2 className="w-5 h-5" />}
                    label="Sorot Tautan"
                  />
                  <Ubin
                    aktif={p.sorotJudul}
                    onClick={() => togglePro("sorotJudul")}
                    ikon={<Heading className="w-5 h-5" />}
                    label="Sorot Judul"
                  />
                </div>
              </Bagian>

              {/* --- Bantuan navigasi --- */}
              <Bagian judul="Bantuan Navigasi">
                <div className="grid grid-cols-3 gap-2">
                  <Ubin
                    aktif={p.fokusJelas}
                    onClick={() => togglePro("fokusJelas")}
                    ikon={<Focus className="w-5 h-5" />}
                    label="Fokus Tegas"
                  />
                  <Ubin
                    aktif={membaca}
                    onClick={bacakanHalaman}
                    ikon={membaca ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    label={membaca ? "Hentikan" : "Bacakan"}
                  />
                  <Ubin
                    aktif={p.penunjukBaca}
                    onClick={() => togglePro("penunjukBaca")}
                    ikon={<Square className="w-5 h-5" />}
                    label="Pemandu Baca"
                  />
                  <Ubin
                    aktif={p.kursorBesar}
                    onClick={() => togglePro("kursorBesar")}
                    ikon={<MousePointer2 className="w-5 h-5" />}
                    label="Kursor Besar"
                  />
                  <Ubin
                    aktif={false}
                    onClick={bukaStruktur}
                    ikon={<ListTree className="w-5 h-5" />}
                    label="Struktur Isi"
                  />
                </div>
              </Bagian>

              {/* --- Warna --- */}
              <Bagian judul="Penyesuaian Warna">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { nilai: "monokrom", label: "Monokrom", ikon: <Contrast className="w-5 h-5" /> },
                      { nilai: "saturasi-rendah", label: "Warna Redup", ikon: <SunMoon className="w-5 h-5" /> },
                      { nilai: "saturasi-tinggi", label: "Warna Pekat", ikon: <SunMoon className="w-5 h-5" /> },
                      { nilai: "kontras-tinggi", label: "Kontras Tinggi", ikon: <Contrast className="w-5 h-5" /> },
                      { nilai: "kontras-terang", label: "Latar Terang", ikon: <Eye className="w-5 h-5" /> },
                      { nilai: "kontras-gelap", label: "Latar Gelap", ikon: <Eye className="w-5 h-5" /> },
                    ] as { nilai: ModeWarna; label: string; ikon: React.ReactNode }[]
                  ).map((w) => (
                    <Ubin
                      key={w.nilai}
                      aktif={p.warna === w.nilai}
                      onClick={() => ubah("warna", p.warna === w.nilai ? "normal" : w.nilai)}
                      ikon={w.ikon}
                      label={w.label}
                    />
                  ))}
                </div>
              </Bagian>

              {/* --- Alat lain --- */}
              <Bagian judul="Alat Tambahan">
                <div className="grid grid-cols-3 gap-2">
                  <Ubin
                    aktif={p.hentikanGerak}
                    onClick={() => togglePro("hentikanGerak")}
                    ikon={<PauseCircle className="w-5 h-5" />}
                    label="Hentikan Gerak"
                  />
                  <Ubin
                    aktif={p.sembunyikanGambar}
                    onClick={() => togglePro("sembunyikanGambar")}
                    ikon={<EyeOff className="w-5 h-5" />}
                    label="Sembunyikan Gambar"
                  />
                  <Ubin
                    aktif={p.tooltipGambar}
                    onClick={() => togglePro("tooltipGambar")}
                    ikon={<ImageIcon className="w-5 h-5" />}
                    label="Teks Gambar"
                  />
                </div>
              </Bagian>

              {/* --- Pendampingan nyata, bukan sekadar penyesuaian tampilan --- */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <Ear className="w-4 h-4 text-emerald-600" />
                  Butuh Pendampingan Petugas?
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Saat mendaftar <strong>ViDCon</strong>, pilih kebutuhan pendampingan Anda -
                  juru bahasa isyarat, penjelasan lisan, tempo perlahan, atau ruang tenang.
                  Petugas PST menyiapkannya sebelum sesi dimulai.
                </p>
              </div>

              <button
                onClick={resetSemua}
                className="w-full py-3 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Kembalikan Pengaturan Awal
              </button>
            </div>

            {/* Kaki - pernyataan yang bisa diperiksa, bukan klaim tanpa audit */}
            <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white flex items-center gap-2 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>Mengacu pada WCAG 2.1 level AA. Pengaturan tersimpan di peramban Anda.</span>
            </div>
          </div>
        </div>
      )}

      {/* Daftar struktur halaman */}
      {struktur && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 a11y-panel">
          <div
            onClick={() => setStruktur(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Struktur isi halaman"
            className="relative w-full max-w-md max-h-[70vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ListTree className="w-4 h-4 text-indigo-600" />
                Struktur Isi Halaman
              </h3>
              <button
                onClick={() => setStruktur(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
                aria-label="Tutup struktur isi"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {struktur.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  Tidak ada judul yang terbaca di halaman ini.
                </p>
              ) : (
                struktur.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => lompatKe(j.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-sm text-slate-700"
                    style={{ paddingLeft: `${0.75 + (j.taraf - 1) * 0.85}rem` }}
                  >
                    <span className="text-[10px] font-bold text-indigo-500 mr-2">H{j.taraf}</span>
                    {j.teks}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Bagian-bagian kecil
// ---------------------------------------------------------------------------

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-extrabold tracking-wider uppercase text-indigo-600 mb-2.5">
        {judul}
      </h3>
      {children}
    </section>
  );
}

function Ubin({
  aktif,
  onClick,
  ikon,
  label,
}: {
  aktif: boolean;
  onClick: () => void;
  ikon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={aktif}
      className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1.5 p-2 text-center transition-colors ${
        aktif
          ? "bg-indigo-600 border-indigo-600 text-white"
          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
      }`}
    >
      {/*
        Tanda aktif berupa BENTUK, bukan sekadar warna latar.

        Mode kontras memaksa seluruh tombol memakai warna yang sama, sehingga
        ubin menyala dan ubin mati menjadi identik - pengunjung tidak lagi bisa
        melihat penyesuaian mana yang sedang aktif, apalagi mematikannya.
        Justru pengunjung yang paling membutuhkan mode kontras yang paling
        dirugikan. Ini juga inti WCAG 1.4.1: informasi tidak boleh disampaikan
        lewat warna saja.
      */}
      {aktif && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-indigo-700 border border-indigo-700 flex items-center justify-center"
        >
          <Check className="w-3 h-3" strokeWidth={4} />
        </span>
      )}
      {ikon}
      <span className="text-[10px] font-bold leading-tight">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pembantu
// ---------------------------------------------------------------------------

/** Profil dianggap aktif bila SELURUH penyesuaiannya sedang berlaku. */
function profilAktif(p: Pengaturan, kunci: KunciProfil): boolean {
  const profil = PROFIL.find((x) => x.kunci === kunci);
  if (!profil) return false;
  return Object.entries(profil.ubah).every(
    ([k, v]) => p[k as keyof Pengaturan] === v
  );
}


/** Berapa penyesuaian yang sedang menyala - dipakai untuk lencana di tombol. */
function hitungAktif(p: Pengaturan): number {
  let n = 0;
  for (const k of Object.keys(BAWAAN) as (keyof Pengaturan)[]) {
    if (p[k] !== BAWAAN[k]) n += 1;
  }
  return n;
}
