"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Settings2,
  MessageSquareQuote,
  HelpCircle,
  Save,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Star,
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { Faq, Testimonial } from "@/lib/db/schema";
import type { Pengaturan } from "@/lib/content";

type Tab = "pengaturan" | "testimoni" | "faq";

interface DefinisiSetting {
  grup: string;
  label: string;
  bawaan: string;
  bantuan?: string;
  jenis?: string;
  pilihan?: { nilai: string; label: string }[];
}

const JUDUL_GRUP: Record<string, string> = {
  kontak: "Kontak & Alamat Kantor",
  peta: "Peta Lokasi",
  tampilan: "Bagian yang Ditampilkan di Halaman Utama",
  istilah: "Pembahasaan / Istilah",
};

export default function AdminKontenPage() {
  const [tab, setTab] = useState<Tab>("pengaturan");
  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  const [pengaturan, setPengaturan] = useState<Pengaturan | null>(null);
  const [definisi, setDefinisi] = useState<Record<string, DefinisiSetting>>({});
  const [testimoni, setTestimoni] = useState<Testimonial[]>([]);
  const [faq, setFaq] = useState<Faq[]>([]);

  const [editTestimoni, setEditTestimoni] = useState<Partial<Testimonial> | null>(null);
  const [editFaq, setEditFaq] = useState<Partial<Faq> | null>(null);
  const [hapus, setHapus] = useState<{ jenis: "testimoni" | "faq"; id: number; nama: string } | null>(null);

  /**
   * Mengambil konten dari server.
   *
   * `batal` mencegah state diperbarui setelah komponen dilepas - misalnya
   * saat petugas berpindah halaman sebelum permintaan selesai.
   */
  const ambil = useCallback(async (batal?: () => boolean) => {
    try {
      const res = await fetch("/api/admin/konten");
      const json = await res.json();
      if (batal?.()) return;
      if (!json.success) throw new Error(json.message);
      setPengaturan(json.pengaturan);
      setDefinisi(json.definisi);
      setTestimoni(json.testimoni);
      setFaq(json.faq);
    } catch (err) {
      if (batal?.()) return;
      toast.error("Gagal memuat konten", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      if (!batal?.()) setLoading(false);
    }
  }, []);

  /** Muat ulang setelah menyimpan atau menghapus. */
  const muat = useCallback(() => {
    void ambil();
  }, [ambil]);

  useEffect(() => {
    let dilepas = false;
    void ambil(() => dilepas);
    return () => {
      dilepas = true;
    };
  }, [ambil]);

  const simpanPengaturan = async () => {
    if (!pengaturan) return;
    setMenyimpan(true);
    try {
      const res = await fetch("/api/admin/konten", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pengaturan }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Pengaturan tersimpan", {
        description: "Perubahan langsung tampil di halaman utama.",
      });
    } catch (err) {
      toast.error("Gagal menyimpan", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      setMenyimpan(false);
    }
  };

  const simpanTestimoni = async () => {
    if (!editTestimoni) return;
    setMenyimpan(true);
    try {
      const res = await fetch("/api/admin/konten/testimoni", {
        method: editTestimoni.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editTestimoni,
          rating: editTestimoni.rating ?? 5,
          sortOrder: editTestimoni.sortOrder ?? 0,
          isPublished: Boolean(editTestimoni.isPublished),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);
      toast.success(json.message);
      setEditTestimoni(null);
      muat();
    } catch (err) {
      toast.error("Gagal menyimpan testimoni", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      setMenyimpan(false);
    }
  };

  const simpanFaq = async () => {
    if (!editFaq) return;
    setMenyimpan(true);
    try {
      const res = await fetch("/api/admin/konten/faq", {
        method: editFaq.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFaq,
          sortOrder: editFaq.sortOrder ?? 0,
          isPublished: editFaq.isPublished ?? true,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);
      toast.success(json.message);
      setEditFaq(null);
      muat();
    } catch (err) {
      toast.error("Gagal menyimpan FAQ", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      setMenyimpan(false);
    }
  };

  const jalankanHapus = async () => {
    if (!hapus) return;
    try {
      const res = await fetch(`/api/admin/konten/${hapus.jenis}?id=${hapus.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message);
      muat();
    } catch (err) {
      toast.error("Gagal menghapus", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      setHapus(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        Memuat konten...
      </div>
    );
  }

  const grupTampil = ["kontak", "peta", "tampilan", "istilah"] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Kelola Konten Halaman Utama
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ubah isi halaman utama tanpa perlu deploy ulang. Perubahan langsung tampil setelah disimpan.
        </p>
      </div>

      {/* Tab */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "pengaturan", label: "Pengaturan Situs", icon: Settings2 },
            { id: "testimoni", label: `Testimoni (${testimoni.length})`, icon: MessageSquareQuote },
            { id: "faq", label: `FAQ (${faq.length})`, icon: HelpCircle },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all border ${
              tab === id
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* --- TAB PENGATURAN --- */}
      {tab === "pengaturan" && pengaturan && (
        <div className="space-y-5">
          {grupTampil.map((grup) => {
            const kunciGrup = Object.entries(definisi).filter(([, d]) => d.grup === grup);
            if (kunciGrup.length === 0) return null;

            return (
              <div
                key={grup}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4"
              >
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  {JUDUL_GRUP[grup]}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kunciGrup.map(([kunci, def]) => {
                    const nilai = pengaturan[kunci as keyof Pengaturan] ?? "";
                    const ubah = (v: string) =>
                      setPengaturan({ ...pengaturan, [kunci]: v });

                    return (
                      <div
                        key={kunci}
                        className={def.jenis === "teks-panjang" ? "md:col-span-2" : ""}
                      >
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                          {def.label}
                        </label>

                        {def.jenis === "saklar" ? (
                          <button
                            type="button"
                            onClick={() => ubah(nilai === "1" ? "0" : "1")}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                              nilai === "1"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {nilai === "1" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              {nilai === "1" ? "Ditampilkan" : "Disembunyikan"}
                            </span>
                            <span
                              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                                nilai === "1" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                              }`}
                            >
                              <span
                                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                  nilai === "1" ? "translate-x-5" : ""
                                }`}
                              />
                            </span>
                          </button>
                        ) : def.jenis === "pilihan" ? (
                          <select
                            value={nilai}
                            onChange={(e) => ubah(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                          >
                            {def.pilihan?.map((o) => (
                              <option key={o.nilai} value={o.nilai}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : def.jenis === "teks-panjang" ? (
                          <textarea
                            value={nilai}
                            onChange={(e) => ubah(e.target.value)}
                            rows={3}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                          />
                        ) : (
                          <input
                            type="text"
                            value={nilai}
                            onChange={(e) => ubah(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                          />
                        )}

                        {def.bantuan && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {def.bantuan}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <button
            onClick={simpanPengaturan}
            disabled={menyimpan}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {menyimpan ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      )}

      {/* --- TAB TESTIMONI --- */}
      {tab === "testimoni" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold mb-1">Testimoni menyebut nama orang dan instansi.</p>
              <p>
                Ini situs resmi instansi pemerintah. Sebelum menayangkan sebuah testimoni,
                isi dulu <strong>catatan sumber</strong> - dari mana pernyataan itu berasal
                (surat, wawancara, formulir kepuasan). Testimoni tanpa catatan sumber
                ditolak sistem saat hendak ditayangkan.
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              setEditTestimoni({ nama: "", pesan: "", rating: 5, sortOrder: testimoni.length, isPublished: false })
            }
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah Testimoni
          </button>

          <div className="space-y-3">
            {testimoni.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada testimoni.</p>
            )}
            {testimoni.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-start gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{t.nama}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        t.isPublished
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {t.isPublished ? "TAYANG" : "TIDAK TAYANG"}
                    </span>
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {[t.peran, t.instansi].filter(Boolean).join(" - ") || "-"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{t.pesan}</p>
                  {!t.sourceNote && (
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Catatan sumber belum diisi
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditTestimoni(t)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800"
                    title="Ubah"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHapus({ jenis: "testimoni", id: t.id, nama: t.nama })}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB FAQ --- */}
      {tab === "faq" && (
        <div className="space-y-4">
          <button
            onClick={() =>
              setEditFaq({ pertanyaan: "", jawaban: "", sortOrder: faq.length, isPublished: true })
            }
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah FAQ
          </button>

          <div className="space-y-3">
            {faq.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada FAQ.</p>
            )}
            {faq.map((f) => (
              <div
                key={f.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-start gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{f.pertanyaan}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        f.isPublished
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {f.isPublished ? "TAYANG" : "TIDAK TAYANG"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{f.jawaban}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditFaq(f)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800"
                    title="Ubah"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHapus({ jenis: "faq", id: f.id, nama: f.pertanyaan })}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Modal edit testimoni --- overflow-y-auto TANPA items-center, lihat catatan di VidconModal.tsx untuk alasannya. */}
      {editTestimoni && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editTestimoni.id ? "Ubah Testimoni" : "Tambah Testimoni"}
              </h3>
              <button onClick={() => setEditTestimoni(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {[
              { k: "nama", l: "Nama *", ph: "Nama pemberi testimoni" },
              { k: "peran", l: "Peran / jabatan", ph: "Kepala Bidang, Mahasiswa, ..." },
              { k: "instansi", l: "Instansi", ph: "Bappeda, Universitas, ..." },
            ].map(({ k, l, ph }) => (
              <div key={k}>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{l}</label>
                <input
                  type="text"
                  value={(editTestimoni[k as keyof Testimonial] as string) ?? ""}
                  onChange={(e) => setEditTestimoni({ ...editTestimoni, [k]: e.target.value })}
                  placeholder={ph}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Isi testimoni *</label>
              <textarea
                rows={3}
                value={editTestimoni.pesan ?? ""}
                onChange={(e) => setEditTestimoni({ ...editTestimoni, pesan: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Catatan sumber
              </label>
              <textarea
                rows={2}
                value={editTestimoni.sourceNote ?? ""}
                onChange={(e) => setEditTestimoni({ ...editTestimoni, sourceNote: e.target.value })}
                placeholder="Dari mana testimoni ini berasal? Mis. formulir kepuasan 12 Mei 2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Wajib diisi sebelum testimoni bisa ditayangkan.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Rating</label>
                <select
                  value={editTestimoni.rating ?? 5}
                  onChange={(e) => setEditTestimoni({ ...editTestimoni, rating: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} bintang</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Urutan</label>
                <input
                  type="number"
                  value={editTestimoni.sortOrder ?? 0}
                  onChange={(e) => setEditTestimoni({ ...editTestimoni, sortOrder: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditTestimoni({ ...editTestimoni, isPublished: !editTestimoni.isPublished })}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold ${
                editTestimoni.isPublished
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
              }`}
            >
              <span className="flex items-center gap-2">
                {editTestimoni.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {editTestimoni.isPublished ? "Tayang di halaman utama" : "Tidak tayang"}
              </span>
            </button>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditTestimoni(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={simpanTestimoni}
                disabled={menyimpan}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {menyimpan ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* --- Modal edit FAQ --- overflow-y-auto TANPA items-center, lihat catatan di VidconModal.tsx untuk alasannya. */}
      {editFaq && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editFaq.id ? "Ubah FAQ" : "Tambah FAQ"}
              </h3>
              <button onClick={() => setEditFaq(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Pertanyaan *</label>
              <input
                type="text"
                value={editFaq.pertanyaan ?? ""}
                onChange={(e) => setEditFaq({ ...editFaq, pertanyaan: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Jawaban *</label>
              <textarea
                rows={4}
                value={editFaq.jawaban ?? ""}
                onChange={(e) => setEditFaq({ ...editFaq, jawaban: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Kategori</label>
                <input
                  type="text"
                  value={editFaq.kategori ?? ""}
                  onChange={(e) => setEditFaq({ ...editFaq, kategori: e.target.value })}
                  placeholder="ViDCon, Umum, ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Urutan</label>
                <input
                  type="number"
                  value={editFaq.sortOrder ?? 0}
                  onChange={(e) => setEditFaq({ ...editFaq, sortOrder: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditFaq({ ...editFaq, isPublished: !editFaq.isPublished })}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold ${
                editFaq.isPublished
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
              }`}
            >
              <span className="flex items-center gap-2">
                {editFaq.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {editFaq.isPublished ? "Tayang di halaman utama" : "Tidak tayang"}
              </span>
            </button>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditFaq(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={simpanFaq}
                disabled={menyimpan}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {menyimpan ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(hapus)}
        title={hapus?.jenis === "faq" ? "Hapus FAQ" : "Hapus Testimoni"}
        message={`Yakin menghapus "${hapus?.nama ?? ""}"? Tindakan ini tidak bisa dibatalkan.`}
        onConfirm={jalankanHapus}
        onClose={() => setHapus(null)}
      />
    </div>
  );
}
