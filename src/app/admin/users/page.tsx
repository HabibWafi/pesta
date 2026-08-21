"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  UserPlus,
  Pencil,
  Trash2,
  X,
  KeyRound,
  Mail,
  ShieldAlert,
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Akun {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface FormAkun {
  id?: number;
  name: string;
  email: string;
  role: string;
  password: string;
}

const kosong: FormAkun = { name: "", email: "", role: "ADMIN", password: "" };

export default function AdminUsersPage() {
  const [items, setItems] = useState<Akun[]>([]);
  const [sayaId, setSayaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [terlarang, setTerlarang] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [edit, setEdit] = useState<FormAkun | null>(null);
  const [hapus, setHapus] = useState<Akun | null>(null);

  const ambil = useCallback(async (batal?: () => boolean) => {
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (batal?.()) return;
      if (res.status === 403) {
        setTerlarang(true);
        return;
      }
      if (!json.success) throw new Error(json.message);
      setItems(json.items);
      setSayaId(json.sayaId);
    } catch (err) {
      if (batal?.()) return;
      toast.error("Gagal memuat daftar akun", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      if (!batal?.()) setLoading(false);
    }
  }, []);

  const muat = useCallback(() => void ambil(), [ambil]);

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
      const res = await fetch("/api/admin/users", {
        method: edit.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);
      toast.success(json.message);
      setEdit(null);
      muat();
    } catch (err) {
      toast.error("Gagal menyimpan akun", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      setMenyimpan(false);
    }
  };

  const jalankanHapus = async () => {
    if (!hapus) return;
    try {
      const res = await fetch(`/api/admin/users?id=${hapus.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success(json.message);
      muat();
    } catch (err) {
      toast.error("Gagal menghapus akun", {
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
        Memuat daftar akun...
      </div>
    );
  }

  if (terlarang) {
    return (
      <div className="max-w-lg p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex gap-3">
        <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
        <div className="text-sm text-rose-900 dark:text-rose-200">
          <p className="font-bold mb-1">Halaman ini khusus SUPERADMIN.</p>
          <p className="text-xs leading-relaxed">
            Akun Anda berperan ADMIN, yang boleh mengelola layanan tetapi tidak boleh
            menambah, mengubah, atau menghapus akun administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Kelola Akun Administrator
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total {items.length} akun. Password disimpan sebagai hash bcrypt dan tidak pernah
            bisa dibaca kembali - bila lupa, buat password baru dari sini.
          </p>
        </div>

        <button
          onClick={() => setEdit({ ...kosong })}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20"
        >
          <UserPlus className="w-4 h-4" /> Tambah Akun
        </button>
      </div>

      <div className="space-y-3">
        {items.map((a) => {
          const sayaSendiri = a.id === sayaId;
          return (
            <div
              key={a.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{a.name}</p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      a.role === "SUPERADMIN"
                        ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {a.role}
                  </span>
                  {sayaSendiri && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      AKUN ANDA
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" /> {a.email}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() =>
                    setEdit({ id: a.id, name: a.name, email: a.email, role: a.role, password: "" })
                  }
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800"
                  title="Ubah akun"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setHapus(a)}
                  disabled={sayaSendiri}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  title={sayaSendiri ? "Tidak bisa menghapus akun sendiri" : "Hapus akun"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {edit.id ? "Ubah Akun" : "Tambah Akun"}
              </h3>
              <button onClick={() => setEdit(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Nama lengkap *</label>
              <input
                type="text"
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Email *</label>
              <input
                type="email"
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                {edit.id ? "Password baru" : "Password *"}
              </label>
              <input
                type="password"
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                placeholder={edit.id ? "Kosongkan bila tidak diganti" : "Minimal 8 karakter"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Minimal 8 karakter. Sampaikan ke pemiliknya lewat jalur pribadi, jangan lewat grup.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Peran</label>
              <select
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              >
                <option value="ADMIN">ADMIN - mengelola layanan dan konten</option>
                <option value="SUPERADMIN">SUPERADMIN - termasuk mengelola akun</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEdit(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={simpan}
                disabled={menyimpan}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {menyimpan ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(hapus)}
        title="Hapus Akun Administrator"
        message={`Yakin menghapus akun "${hapus?.name ?? ""}" (${hapus?.email ?? ""})? Orang tersebut akan langsung kehilangan akses ke panel.`}
        onConfirm={jalankanHapus}
        onClose={() => setHapus(null)}
      />
    </div>
  );
}
