"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Download,
  Database,
  Search,
  Filter,
  Trash2,
  Edit3,
  X,
  Phone,
  Building,
  MessageCircle,
  Globe,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { PermintaanData } from "@/lib/db/schema";
import { FORMAT_DATA_LABEL, type FormatData } from "@/lib/schemas/permintaan-data";

type SortField = "nama" | "jenisData" | "status";
type SortOrder = "asc" | "desc";

/** Bentuk yang benar-benar dikirim API - tanpa lampiranData (BLOB), lihat route.ts. */
type BarisPermintaanData = Omit<PermintaanData, "lampiranData">;

export default function AdminPermintaanDataPage() {
  const [items, setItems] = useState<BarisPermintaanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<BarisPermintaanData | null>(null);
  const [editStatus, setEditStatus] = useState("DIPROSES");
  const [catatan, setCatatan] = useState("");
  const [updating, setUpdating] = useState(false);

  const [sortField, setSortField] = useState<SortField>("nama");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.append("status", statusFilter);
      if (search) query.append("q", search);

      const res = await fetch(`/api/admin/permintaan-data?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      toast.error("Gagal Memuat Data", {
        description: "Terjadi kendala saat mengambil daftar permintaan data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedItems = useMemo(() => {
    const kunci = (item: BarisPermintaanData): string => String(item[sortField] ?? "").toLowerCase();
    return [...items].sort((a, b) => {
      const aVal = kunci(a);
      const bVal = kunci(b);
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortOrder]);

  const totalItems = sortedItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(start, start + itemsPerPage);
  }, [sortedItems, currentPage]);

  const openEditModal = (item: BarisPermintaanData) => {
    setSelectedItem(item);
    setEditStatus(item.status);
    setCatatan(item.catatanAdmin || "");
  };

  const handleUpdateStatus = async () => {
    if (!selectedItem) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/permintaan-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedItem.id, status: editStatus, catatanAdmin: catatan }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success("Status Permintaan Data Berhasil Diperbarui", {
        description: `Permintaan atas nama ${selectedItem.nama} telah disesuaikan menjadi ${editStatus}.`,
      });
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      toast.error("Gagal Memperbarui Permintaan", {
        description: err instanceof Error ? err.message : "Mohon periksa kembali isian data Anda.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/permintaan-data?id=${deleteTargetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success("Permintaan Data Berhasil Dihapus", {
        description: "Data permintaan telah berhasil dihapus dari daftar layanan.",
      });
      setDeleteTargetId(null);
      fetchData();
    } catch (err) {
      toast.error("Gagal Menghapus Data", {
        description: err instanceof Error ? err.message : "Terjadi kendala saat menghapus data permintaan.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold text-[10px]">PENDING</span>;
      case "DIPROSES":
        return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-[10px]">DIPROSES</span>;
      case "SELESAI":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold text-[10px]">SELESAI</span>;
      case "DITOLAK":
        return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 font-bold text-[10px]">DITOLAK</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-bold text-[10px]">{status}</span>;
    }
  };

  const getSumberBadge = (sumber: string) =>
    sumber === "WHATSAPP" ? (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[9px] border border-emerald-300"
        title="Masuk lewat bot WhatsApp Beregam"
      >
        <MessageCircle className="w-2.5 h-2.5" /> WA
      </span>
    ) : (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-[9px] border border-slate-300 dark:border-slate-600"
        title="Masuk lewat formulir web PESTA"
      >
        <Globe className="w-2.5 h-2.5" /> Web
      </span>
    );

  const renderSortHeader = (label: string, field: SortField, className = "") => (
    <th
      onClick={() => handleSort(field)}
      className={`p-3.5 cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1 font-extrabold text-slate-900 dark:text-white uppercase text-[11px]">
        <span>{label}</span>
        {sortField === field ? (
          sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-60 shrink-0" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Permintaan Data?"
        message="Apakah Anda yakin ingin menghapus data permintaan ini? Data yang dihapus tidak dapat dikembalikan."
        confirmText="Ya, Hapus Permintaan"
        cancelText="Batal"
        variant="danger"
        loading={deleting}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Kelola Permintaan Data
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Permintaan data statistik dari web PESTA dan bot WhatsApp Beregam (Total: {totalItems})
          </p>
        </div>

        <a
          href="/api/admin/ekspor?jenis=permintaan-data"
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs inline-flex items-center gap-2 shrink-0"
          title="Unduh seluruh data sebagai berkas CSV"
        >
          <Download className="w-4 h-4" /> Ekspor CSV
        </a>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, instansi, email, jenis data..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Pending</option>
            <option value="DIPROSES">Diproses</option>
            <option value="SELESAI">Selesai</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed border-collapse min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <tr>
                {renderSortHeader("Pemohon", "nama", "w-[24%]")}
                {renderSortHeader("Data yang Diminta", "jenisData", "w-[38%]")}
                <th className="p-3.5 w-[15%] font-extrabold uppercase text-slate-900 dark:text-white text-[11px]">Format</th>
                {renderSortHeader("Status", "status", "w-[11%]")}
                <th className="p-3.5 text-right w-[12%] font-extrabold uppercase text-slate-900 dark:text-white text-[11px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Memuat daftar permintaan...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Belum ada permintaan data.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3.5 overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900 dark:text-white text-xs truncate" title={item.nama}>
                          {item.nama}
                        </p>
                        {getSumberBadge(item.sumber)}
                        {item.lampiranNama && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-extrabold text-[9px] border border-indigo-300"
                            title={`Ada lampiran: ${item.lampiranNama}`}
                          >
                            <Paperclip className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300 truncate mt-0.5" title={item.asalInstansi}>
                        <Building className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                        <span className="truncate">{item.asalInstansi}</span>
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300 truncate mt-0.5" title={item.noHp}>
                        <Phone className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                        <span className="truncate">{item.noHp}</span>
                      </p>
                    </td>

                    <td className="p-3.5 overflow-hidden">
                      <span className="font-bold text-blue-600 dark:text-blue-400 block text-xs truncate mb-0.5" title={item.jenisData}>
                        {item.jenisData}
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2 leading-relaxed break-words">
                        {item.keperluan}
                      </p>
                    </td>

                    <td className="p-3.5 overflow-hidden">
                      <span className="text-slate-700 dark:text-slate-200 text-[11px] font-semibold">
                        {FORMAT_DATA_LABEL[item.formatDiinginkan as FormatData] ?? item.formatDiinginkan}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap overflow-hidden">{getStatusBadge(item.status)}</td>

                    <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-600 dark:hover:bg-blue-600 text-blue-600 dark:text-blue-300 hover:text-white transition-colors"
                        title="Ubah Status"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(item.id)}
                        className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/40 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white transition-colors"
                        title="Hapus Permintaan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalItems > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold">
              Menampilkan <span className="font-extrabold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> -{" "}
              <span className="font-extrabold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari{" "}
              <span className="font-extrabold text-slate-900 dark:text-white">{totalItems}</span> permintaan
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <div key={p} className="flex items-center gap-1">
                      {showEllipsis && <span className="px-1 text-slate-400 dark:text-slate-500 text-xs">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${
                          currentPage === p
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  );
                })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* overflow-y-auto di sini, BUKAN items-center - dialog panjang di HP kecil butuh bisa digulung sampai ke tombol paling atas/bawah. */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Ubah Status Permintaan</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p><strong className="text-slate-900 dark:text-white">Pemohon:</strong> {selectedItem.nama} ({selectedItem.asalInstansi})</p>
              <p><strong className="text-slate-900 dark:text-white">Kontak:</strong> {selectedItem.email} &middot; {selectedItem.noHp}</p>
              <p><strong className="text-slate-900 dark:text-white">Alamat:</strong> {selectedItem.alamat}</p>
              <p><strong className="text-slate-900 dark:text-white">Data diminta:</strong> {selectedItem.jenisData}</p>
              <p><strong className="text-slate-900 dark:text-white">Keperluan:</strong> {selectedItem.keperluan}</p>
              <p><strong className="text-slate-900 dark:text-white">Format:</strong> {FORMAT_DATA_LABEL[selectedItem.formatDiinginkan as FormatData] ?? selectedItem.formatDiinginkan}</p>
              {selectedItem.catatan && (
                <p><strong className="text-slate-900 dark:text-white">Catatan pemohon:</strong> {selectedItem.catatan}</p>
              )}
              {selectedItem.lampiranNama && (
                <p className="pt-1 mt-1 border-t border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white">Lampiran:</strong>{" "}
                  <a
                    href={`/api/admin/permintaan-data/${selectedItem.id}/lampiran`}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    <Paperclip className="w-3 h-3" />
                    {selectedItem.lampiranNama}
                    {selectedItem.lampiranUkuran ? ` (${(selectedItem.lampiranUkuran / 1024).toFixed(0)} KB)` : ""}
                  </a>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Status Permintaan</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none"
              >
                <option value="PENDING">PENDING (Menunggu Verifikasi)</option>
                <option value="DIPROSES">DIPROSES (Sedang Disiapkan)</option>
                <option value="SELESAI">SELESAI (Data Sudah Diserahkan)</option>
                <option value="DITOLAK">DITOLAK</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Catatan Petugas</label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
                placeholder="Tuliskan progres penyiapan data atau alasan penolakan..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {updating ? "Simpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
