"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Save,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  X,
  ArrowUp,
  ArrowDown,
  Info,
  MessageCircleWarning,
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { BeregamFaq } from "@/lib/beregam/db/schema";

interface Konfigurasi {
  rateLimitPerMenit: number;
  rateLimitHarian: number;
  jamBukaTutup: string;
  notifikasiPetugasAktif: boolean;
}

const ESKALASI = "[ESKALASI]";

export default function AdminBeregamPage() {
  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [menu, setMenu] = useState<BeregamFaq[]>([]);
  const [konfigurasi, setKonfigurasi] = useState<Konfigurasi | null>(null);
  const [edit, setEdit] = useState<Partial<BeregamFaq> | null>(null);
  const [hapus, setHapus] = useState<{ id: number; judul: string } | null>(null);

  const ambil = useCallback(async (batal?: () => boolean) => {
    try {
      const res = await fetch("/api/admin/beregam/menu");
      const json = await res.json();
      if (batal?.()) return;
      if (!json.success) throw new Error(json.message);
      setMenu(json.menu);
      setKonfigurasi(json.konfigurasi);
    } catch (err) {
      if (batal?.()) return;
      toast.error("Gagal memuat menu bot", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      if (!batal?.()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let dilepas = false;
    void ambil(() => dilepas);
    return () => {
      dilepas = true;
    };
  }, [ambil]);

  const simpan = async () => {
    if (!edit) return;
    setMenyimpan(true);
    try {
      const isBaru = !edit.id;
      const res = await fetch("/api/admin/beregam/menu", {
        method: isBaru ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: edit.id,
          title: edit.title ?? "",
          answer: edit.answer ?? "",
          isActive: edit.isActive ?? true,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Gagal menyimpan");
      toast.success(isBaru ? "Menu ditambahkan" : "Menu diperbarui");
      setEdit(null);
      void ambil();
    } catch (err) {
      toast.error("Gagal menyimpan menu", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setMenyimpan(false);
    }
  };

  const toggleAktif = async (item: BeregamFaq) => {
    try {
      const res = await fetch("/api/admin/beregam/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          answer: item.answer,
          isActive: !item.isActive,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      void ambil();
    } catch (err) {
      toast.error("Gagal mengubah status", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    }
  };

  const geser = async (id: number, arah: "naik" | "turun") => {
    try {
      const res = await fetch("/api/admin/beregam/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, arah }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      void ambil();
    } catch (err) {
      toast.error("Gagal mengubah urutan", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    }
  };

  const konfirmasiHapus = async () => {
    if (!hapus) return;
    try {
      const res = await fetch(`/api/admin/beregam/menu?id=${hapus.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Menu dihapus");
      setHapus(null);
      void ambil();
    } catch (err) {
      toast.error("Gagal menghapus menu", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh] text-slate-500 text-sm">
        Memuat menu bot...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Menu Bot WhatsApp Beregam</h1>
          <p className="text-sm text-slate-500">
            Isi pesan yang dibalas bot ke warga saat mengetik angka menu.
          </p>
        </div>
      </div>

      {konfigurasi && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KartuInfo label="Batas balasan" nilai={`${konfigurasi.rateLimitPerMenit}/menit per nomor`} />
          <KartuInfo label="Batas harian" nilai={`${konfigurasi.rateLimitHarian} pesan/hari`} />
          <KartuInfo label="Jam layanan" nilai={konfigurasi.jamBukaTutup} />
          <KartuInfo
            label="Notifikasi petugas"
            nilai={konfigurasi.notifikasiPetugasAktif ? "Aktif" : "Belum diatur"}
            warna={konfigurasi.notifikasiPetugasAktif ? "hijau" : "kuning"}
          />
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-sm text-indigo-900">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          Nomor menu (1, 2, 3, ...) dihitung otomatis dari urutan di bawah -
          menonaktifkan atau memindah menu akan menomori ulang sisanya sendiri,
          supaya warga tidak pernah melihat nomor yang meloncat.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {menu.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">Belum ada menu.</div>
        )}

        {menu.map((item, i) => {
          const eskalasi = item.answer.trim() === ESKALASI;
          return (
            <div key={item.id} className={`p-4 flex items-start gap-3 ${!item.isActive ? "opacity-50" : ""}`}>
              <div className="flex flex-col items-center gap-1 pt-1">
                <button
                  onClick={() => geser(item.id, "naik")}
                  disabled={i === 0}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Pindah ke atas"
                >
                  <ArrowUp className="w-4 h-4 text-slate-500" />
                </button>
                <span className="text-sm font-bold text-indigo-600 w-6 text-center">
                  {item.isActive ? item.menuKey : "-"}
                </span>
                <button
                  onClick={() => geser(item.id, "turun")}
                  disabled={i === menu.length - 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Pindah ke bawah"
                >
                  <ArrowDown className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  {eskalasi && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      <MessageCircleWarning className="w-3 h-3" /> Eskalasi ke petugas
                    </span>
                  )}
                  {!item.isActive && (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                      Nonaktif
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1 whitespace-pre-line line-clamp-3">
                  {eskalasi
                    ? "Otomatis menyambungkan warga ke petugas - tidak mengirim teks apa pun."
                    : item.answer}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleAktif(item)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                  title={item.isActive ? "Sembunyikan dari menu" : "Tampilkan di menu"}
                >
                  {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEdit(item)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {!eskalasi && (
                  <button
                    onClick={() => setHapus({ id: item.id, judul: item.title })}
                    className="p-2 rounded-lg hover:bg-rose-50 text-rose-500"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setEdit({ title: "", answer: "", isActive: true })}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm"
      >
        <Plus className="w-4 h-4" /> Tambah Menu
      </button>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{edit.id ? "Edit Menu" : "Menu Baru"}</h2>
              <button onClick={() => setEdit(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Judul (tampil di daftar menu)
                </label>
                <input
                  type="text"
                  value={edit.title ?? ""}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="mis. Permintaan data statistik"
                  maxLength={150}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Jawaban (dibalas persis seperti ini ke warga)
                </label>
                <textarea
                  value={edit.answer === ESKALASI ? "" : (edit.answer ?? "")}
                  onChange={(e) => setEdit({ ...edit, answer: e.target.value })}
                  disabled={edit.answer === ESKALASI}
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="Tulis pesan yang dibalas bot. *teks* menjadi tebal di WhatsApp."
                />
                {edit.answer === ESKALASI ? (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Ini menu eskalasi khusus - memilihnya langsung menyambungkan warga ke
                    petugas, tidak mengirim teks. Tidak bisa diedit sebagai teks biasa.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1.5">
                    Tips: *tebal*, _miring_, dan baris baru berlaku persis seperti di WhatsApp.
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={edit.isActive ?? true}
                  onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Tampilkan di menu bot
              </label>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEdit(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={simpan}
                disabled={menyimpan || !edit.title?.trim() || (edit.answer !== ESKALASI && !edit.answer?.trim())}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {menyimpan ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!hapus}
        onClose={() => setHapus(null)}
        onConfirm={konfirmasiHapus}
        title="Hapus menu ini?"
        message={`"${hapus?.judul}" akan dihapus permanen dan nomor menu lainnya disusun ulang.`}
        confirmText="Hapus"
        variant="danger"
      />
    </div>
  );
}

function KartuInfo({
  label,
  nilai,
  warna,
}: {
  label: string;
  nilai: string;
  warna?: "hijau" | "kuning";
}) {
  const warnaTeks =
    warna === "hijau" ? "text-emerald-600" : warna === "kuning" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${warnaTeks}`}>{nilai}</div>
    </div>
  );
}
