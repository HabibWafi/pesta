"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  MessageSquareText,
  Inbox,
  Send,
  CheckCircle2,
  RotateCcw,
  Search,
  User,
  Ban,
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { BeregamFaq } from "@/lib/beregam/db/schema";

type Tab = "menu" | "pesan" | "percakapan";

interface Konfigurasi {
  rateLimitPerMenit: number;
  rateLimitHarian: number;
  jamBukaTutup: string;
  notifikasiPetugasAktif: boolean;
}

interface PesanSistem {
  kunci: string;
  label: string;
  bantuan: string | null;
  bawaan: string;
  nilai: string;
  sudahDiubah: boolean;
}

interface BarisPercakapan {
  id: number;
  wa_id: string;
  phone: string;
  name: string | null;
  is_blocked: number;
  opted_out_at: string | null;
  message_count: number;
  last_seen_at: string | null;
  mode: "bot" | "manual" | null;
  state: string | null;
  pesan_terakhir: string | null;
  arah_terakhir: "in" | "out" | null;
  waktu_pesan_terakhir: string | null;
  handover_id: number | null;
  handover_status: "open" | "claimed" | "resolved" | null;
  handover_reason: string | null;
  handover_assigned_to: number | null;
  handover_dibuka: string | null;
}

interface PesanThread {
  id: number;
  direction: "in" | "out";
  type: string;
  body: string | null;
  source: string | null;
  createdAt: string;
}

const ESKALASI = "[ESKALASI]";

function waktuSingkat(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminBeregamPage() {
  const [tab, setTab] = useState<Tab>("menu");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bot WhatsApp Beregam</h1>
          <p className="text-sm text-slate-500">Menu, naskah pesan, dan percakapan warga.</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        <TabBtn aktif={tab === "menu"} onClick={() => setTab("menu")} icon={MessageSquareText}>
          Menu Bot
        </TabBtn>
        <TabBtn aktif={tab === "pesan"} onClick={() => setTab("pesan")} icon={Info}>
          Naskah Pesan Sistem
        </TabBtn>
        <TabBtn aktif={tab === "percakapan"} onClick={() => setTab("percakapan")} icon={Inbox}>
          Percakapan
        </TabBtn>
      </div>

      {tab === "menu" && <TabMenu />}
      {tab === "pesan" && <TabPesan />}
      {tab === "percakapan" && <TabPercakapan />}
    </div>
  );
}

function TabBtn({
  aktif,
  onClick,
  icon: Icon,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${
        aktif ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  );
}

function KartuInfo({ label, nilai, warna }: { label: string; nilai: string; warna?: "hijau" | "kuning" }) {
  const warnaTeks =
    warna === "hijau" ? "text-emerald-600" : warna === "kuning" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${warnaTeks}`}>{nilai}</div>
    </div>
  );
}

// =============================================================================
// TAB: Menu Bot
// =============================================================================

function TabMenu() {
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
        body: JSON.stringify({ id: item.id, title: item.title, answer: item.answer, isActive: !item.isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      void ambil();
    } catch (err) {
      toast.error("Gagal mengubah status", { description: err instanceof Error ? err.message : "Terjadi kesalahan." });
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
      toast.error("Gagal mengubah urutan", { description: err instanceof Error ? err.message : "Terjadi kesalahan." });
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
      toast.error("Gagal menghapus menu", { description: err instanceof Error ? err.message : "Terjadi kesalahan." });
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Memuat menu bot...</div>;
  }

  return (
    <div className="space-y-6 pt-2">
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
          Nomor menu (1, 2, 3, ...) dihitung otomatis dari urutan di bawah - menonaktifkan atau
          memindah menu akan menomori ulang sisanya sendiri, supaya warga tidak pernah melihat
          nomor yang meloncat.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {menu.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Belum ada menu.</div>}

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
                  {eskalasi ? "Otomatis menyambungkan warga ke petugas - tidak mengirim teks apa pun." : item.answer}
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
                <button onClick={() => setEdit(item)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Edit">
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
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Judul (tampil di daftar menu)</label>
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
                    Ini menu eskalasi khusus - memilihnya langsung menyambungkan warga ke petugas, tidak
                    mengirim teks. Tidak bisa diedit sebagai teks biasa.
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
              <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
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

// =============================================================================
// TAB: Naskah Pesan Sistem
// =============================================================================

function TabPesan() {
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState<PesanSistem[]>([]);
  const [edit, setEdit] = useState<PesanSistem | null>(null);
  const [draft, setDraft] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  const ambil = useCallback(async (batal?: () => boolean) => {
    try {
      const res = await fetch("/api/admin/beregam/pesan");
      const json = await res.json();
      if (batal?.()) return;
      if (!json.success) throw new Error(json.message);
      setPesan(json.pesan);
    } catch (err) {
      if (batal?.()) return;
      toast.error("Gagal memuat naskah pesan", { description: err instanceof Error ? err.message : "Terjadi kendala jaringan." });
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

  const bukaEdit = (item: PesanSistem) => {
    setEdit(item);
    setDraft(item.nilai);
  };

  const simpan = async () => {
    if (!edit) return;
    setMenyimpan(true);
    try {
      const res = await fetch("/api/admin/beregam/pesan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kunci: edit.kunci, nilai: draft }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Gagal menyimpan");
      toast.success("Naskah disimpan");
      setEdit(null);
      void ambil();
    } catch (err) {
      toast.error("Gagal menyimpan naskah", { description: err instanceof Error ? err.message : "Terjadi kesalahan." });
    } finally {
      setMenyimpan(false);
    }
  };

  const kembalikanBawaan = async () => {
    if (!edit) return;
    try {
      const res = await fetch(`/api/admin/beregam/pesan?kunci=${edit.kunci}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Dikembalikan ke naskah bawaan");
      setEdit(null);
      void ambil();
    } catch (err) {
      toast.error("Gagal mengembalikan", { description: err instanceof Error ? err.message : "Terjadi kesalahan." });
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Memuat naskah pesan...</div>;
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-sm text-indigo-900">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          Naskah ini dikirim OTOMATIS oleh alur percakapan - sapaan, saat bot tidak paham, dan
          eskalasi ke petugas. Berbeda dari tab Menu Bot, yang mengelola jawaban menu bernomor.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {pesan.map((item) => (
          <button
            key={item.kunci}
            onClick={() => bukaEdit(item)}
            className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-900">{item.label}</h3>
                {item.sudahDiubah && (
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
                    Sudah diubah
                  </span>
                )}
              </div>
              {item.bantuan && <p className="text-xs text-slate-400 mt-0.5">{item.bantuan}</p>}
              <p className="text-sm text-slate-500 mt-1.5 whitespace-pre-line line-clamp-2">{item.nilai}</p>
            </div>
            <Pencil className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          </button>
        ))}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{edit.label}</h2>
              <button onClick={() => setEdit(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {edit.bantuan && <p className="text-xs text-slate-500">{edit.bantuan}</p>}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={9}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400">
                Tips: *tebal*, _miring_, dan baris baru berlaku persis seperti di WhatsApp.
              </p>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-2">
              {edit.sudahDiubah ? (
                <button
                  onClick={kembalikanBawaan}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Kembalikan ke naskah bawaan
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
                  Batal
                </button>
                <button
                  onClick={simpan}
                  disabled={menyimpan || !draft.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {menyimpan ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TAB: Percakapan
// =============================================================================

function BadgeMode({ mode, state }: { mode: string | null; state: string | null }) {
  if (mode === "manual") {
    return (
      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        Ditangani manual
      </span>
    );
  }
  if (state === "awaiting_escalation_reason") {
    return (
      <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">
        Menunggu keterangan
      </span>
    );
  }
  return (
    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
      Bot aktif
    </span>
  );
}

function BadgeHandover({ status }: { status: string | null }) {
  if (status === "open") {
    return (
      <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
        Perlu ditindaklanjuti
      </span>
    );
  }
  if (status === "claimed") {
    return (
      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
        Sedang ditangani
      </span>
    );
  }
  return null;
}

function TabPercakapan() {
  const [loading, setLoading] = useState(true);
  const [daftar, setDaftar] = useState<BarisPercakapan[]>([]);
  const [cari, setCari] = useState("");
  const [dipilih, setDipilih] = useState<number | null>(null);

  const ambil = useCallback(
    async (batal?: () => boolean) => {
      try {
        const res = await fetch(`/api/admin/beregam/percakapan?cari=${encodeURIComponent(cari)}`);
        const json = await res.json();
        if (batal?.()) return;
        if (!json.success) throw new Error(json.message);
        setDaftar(json.percakapan);
      } catch (err) {
        if (batal?.()) return;
        toast.error("Gagal memuat percakapan", { description: err instanceof Error ? err.message : "Terjadi kendala jaringan." });
      } finally {
        if (!batal?.()) setLoading(false);
      }
    },
    [cari]
  );

  useEffect(() => {
    let dilepas = false;
    void ambil(() => dilepas);
    const interval = setInterval(() => void ambil(() => dilepas), 15000);
    return () => {
      dilepas = true;
      clearInterval(interval);
    };
  }, [ambil]);

  return (
    <div className="space-y-4 pt-2">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nomor atau nama..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">Memuat percakapan...</div>
      ) : daftar.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500">Belum ada percakapan.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {daftar.map((p) => (
            <button
              key={p.id}
              onClick={() => setDipilih(p.id)}
              className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-50"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{p.name || `+${p.phone}`}</span>
                  {p.name && <span className="text-xs text-slate-400">+{p.phone}</span>}
                  {p.is_blocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                      <Ban className="w-3 h-3" /> Diblokir
                    </span>
                  ) : (
                    <BadgeMode mode={p.mode} state={p.state} />
                  )}
                  <BadgeHandover status={p.handover_status} />
                </div>
                <p className="text-sm text-slate-500 mt-1 truncate">
                  {p.arah_terakhir === "out" && <span className="text-slate-400">Anda: </span>}
                  {p.pesan_terakhir || <span className="italic text-slate-400">(tanpa pesan teks)</span>}
                </p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{waktuSingkat(p.waktu_pesan_terakhir)}</span>
            </button>
          ))}
        </div>
      )}

      {dipilih && (
        <DetailPercakapan
          id={dipilih}
          onClose={() => setDipilih(null)}
          onBerubah={() => void ambil()}
        />
      )}
    </div>
  );
}

function DetailPercakapan({ id, onClose, onBerubah }: { id: number; onClose: () => void; onBerubah: () => void }) {
  const [loading, setLoading] = useState(true);
  const [kontak, setKontak] = useState<BarisPercakapan | null>(null);
  const [pesan, setPesan] = useState<PesanThread[]>([]);
  const [handoverAktif, setHandoverAktif] = useState<{ id: number; status: string; reason: string } | null>(null);
  const [balasan, setBalasan] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [menyelesaikan, setMenyelesaikan] = useState(false);
  const bawahRef = useRef<HTMLDivElement>(null);

  const ambil = useCallback(async (batal?: () => boolean) => {
    try {
      const res = await fetch(`/api/admin/beregam/percakapan/${id}`);
      const json = await res.json();
      if (batal?.()) return;
      if (!json.success) throw new Error(json.message);
      setKontak(json.kontak);
      setPesan(json.pesan);
      const terbuka = (json.handovers as { id: number; status: string; reason: string }[]).find(
        (h) => h.status === "open" || h.status === "claimed"
      );
      setHandoverAktif(terbuka ?? null);
    } catch (err) {
      if (batal?.()) return;
      toast.error("Gagal memuat percakapan", { description: err instanceof Error ? err.message : "Terjadi kendala jaringan." });
    } finally {
      if (!batal?.()) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let dilepas = false;
    void ambil(() => dilepas);
    const interval = setInterval(() => void ambil(() => dilepas), 8000);
    return () => {
      dilepas = true;
      clearInterval(interval);
    };
  }, [ambil]);

  useEffect(() => {
    bawahRef.current?.scrollIntoView({ block: "end" });
  }, [pesan.length]);

  const kirim = async () => {
    if (!balasan.trim()) return;
    setMengirim(true);
    try {
      const res = await fetch(`/api/admin/beregam/percakapan/${id}/balas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pesan: balasan }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Gagal mengirim");
      setBalasan("");
      toast.success("Balasan diantrekan untuk dikirim");
      void ambil();
      onBerubah();
    } catch (err) {
      toast.error("Gagal mengirim balasan", { description: err instanceof Error ? err.message : "Terjadi kesalahan." });
    } finally {
      setMengirim(false);
    }
  };

  const selesaikan = async () => {
    setMenyelesaikan(true);
    try {
      const res = await fetch(`/api/admin/beregam/percakapan/${id}/selesai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Gagal menandai selesai");
      toast.success("Percakapan ditandai selesai - bot aktif kembali untuk kontak ini");
      void ambil();
      onBerubah();
    } catch (err) {
      toast.error("Gagal menandai selesai", { description: err instanceof Error ? err.message : "Terjadi kesalahan." });
    } finally {
      setMenyelesaikan(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-900">{kontak?.name || (kontak ? `+${kontak.phone}` : "Memuat...")}</h2>
            {kontak?.name && <p className="text-xs text-slate-500">+{kontak.phone}</p>}
          </div>
          <div className="flex items-center gap-2">
            {handoverAktif && (
              <button
                onClick={selesaikan}
                disabled={menyelesaikan}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Tandai Selesai
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {handoverAktif && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
            <span className="font-semibold">Alasan eskalasi:</span> {handoverAktif.reason}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">Memuat pesan...</div>
          ) : pesan.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">Belum ada pesan.</div>
          ) : (
            pesan.map((p) => (
              <div key={p.id} className={`flex ${p.direction === "out" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${
                    p.direction === "out"
                      ? p.source === "agent" || p.source === "agent_phone"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-700 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {p.type !== "text" && p.type !== "chat" && (
                    <div className="text-[11px] opacity-70 mb-1">[{p.type}]</div>
                  )}
                  {p.body || <span className="italic opacity-60">(tanpa teks)</span>}
                  <div className="text-[10px] opacity-60 mt-1 flex items-center gap-1.5">
                    {waktuSingkat(p.createdAt)}
                    {p.direction === "out" && p.source && (
                      <span>
                        ·{" "}
                        {p.source === "agent"
                          ? "petugas (admin)"
                          : p.source === "agent_phone"
                            ? "petugas (HP)"
                            : p.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bawahRef} />
        </div>

        <div className="p-3 border-t border-slate-100 shrink-0">
          <div className="flex gap-2">
            <textarea
              value={balasan}
              onChange={(e) => setBalasan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void kirim();
                }
              }}
              rows={2}
              placeholder="Tulis balasan... (Enter untuk kirim, Shift+Enter baris baru)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={kirim}
              disabled={mengirim || !balasan.trim()}
              className="px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 shrink-0"
              title="Kirim balasan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Balasan dikirim dari nomor bot dan mengunci sesi ke mode manual - bot tidak akan ikut menjawab.
          </p>
        </div>
      </div>
    </div>
  );
}
