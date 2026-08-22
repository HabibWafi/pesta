"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Download,
  Mail, 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle2, 
  X, 
  User, 
  Phone, 
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { ContactMessage } from "@/lib/db/schema";

/** Route /api/admin/contact menambahkan isRead turunan dari kolom status. */
type KontakItem = ContactMessage & { isRead: boolean };

type SortField = "nama" | "subjek" | "createdAt" | "isRead";
type SortOrder = "asc" | "desc";

export default function AdminContactPage() {
  const [items, setItems] = useState<KontakItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<KontakItem | null>(null);
  const [replyText, setReplyText] = useState("");

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Custom Delete Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (readFilter !== "ALL") query.append("isRead", readFilter);
      if (search) query.append("q", search);

      const res = await fetch(`/api/admin/contact?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      toast.error("Gagal Memuat Pesan", {
        description: "Terjadi kendala saat mengambil daftar pesan kontak PST.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    setCurrentPage(1);
  }, [readFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchMessages();
  };

  // Toggle Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Sorted Items
  const sortedItems = useMemo(() => {
    // Nilai pembanding dinormalkan lebih dulu supaya tanggal dibandingkan
    // sebagai angka dan teks dibandingkan tanpa peka huruf besar-kecil.
    const kunci = (item: KontakItem): number | string =>
      sortField === "createdAt"
        ? new Date(item.createdAt).getTime()
        : String(item[sortField] ?? "").toLowerCase();

    return [...items].sort((a, b) => {
      const aVal = kunci(a);
      const bVal = kunci(b);
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortOrder]);

  // Paginated Items
  const totalItems = sortedItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(start, start + itemsPerPage);
  }, [sortedItems, currentPage]);

  const handleMarkAsRead = async (id: number, currentReadStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: !currentReadStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success(
        !currentReadStatus ? "Pesan Ditandai Dibaca" : "Pesan Ditandai Belum Dibaca",
        { description: "Status pesan telah disesuaikan." }
      );
      fetchMessages();
    } catch (err: any) {
      toast.error("Gagal Mengubah Status Pesan", {
        description: err.message || "Terjadi kendala saat memperbarui pesan.",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/contact?id=${deleteTargetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success("Pesan Berhasil Dihapus", {
        description: "Data pesan kontak telah dihapus dari daftar inbox.",
      });
      setDeleteTargetId(null);
      fetchMessages();
    } catch (err: any) {
      toast.error("Gagal Menghapus Pesan", {
        description: err.message || "Terjadi kesalahan saat menghapus pesan.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openReplyModal = (item: any) => {
    setSelectedItem(item);
    setReplyText("");
    if (!item.isRead) {
      handleMarkAsRead(item.id, false);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedItem) return;
    const mailto = `mailto:${selectedItem.email}?subject=RE: ${encodeURIComponent(
      selectedItem.subjek
    )}&body=${encodeURIComponent(replyText)}`;
    window.open(mailto, "_blank");

    toast.success("Membuka Aplikasi Email", {
      description: `Balasan siap dikirim ke alamat email ${selectedItem.email}.`,
    });
    setSelectedItem(null);
  };

  const renderSortHeader = (label: string, field: SortField, className = "") => (
    <th 
      onClick={() => handleSort(field)}
      className={`p-3.5 cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1 font-extrabold text-slate-900 dark:text-white uppercase text-[11px]">
        <span>{label}</span>
        {sortField === field ? (
          sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-60 shrink-0" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Pesan Kontak?"
        message="Apakah Anda yakin ingin menghapus pesan kontak ini? Data yang dihapus tidak dapat dipulihkan."
        confirmText="Ya, Hapus Pesan"
        cancelText="Batal"
        variant="danger"
        loading={deleting}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            Pesan Kontak PST
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Inbox formulir pertanyaan & konsultasi umum dari website PESTA (Total: {totalItems} Pesan)
          </p>
        </div>

        <a
          href="/api/admin/ekspor?jenis=kontak"
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs inline-flex items-center gap-2 shrink-0"
          title="Unduh seluruh data sebagai berkas CSV"
        >
          <Download className="w-4 h-4" /> Ekspor CSV
        </a>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, subjek..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status Dibaca:</span>
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">Semua Pesan</option>
            <option value="false">Belum Dibaca</option>
            <option value="true">Sudah Dibaca</option>
          </select>
        </div>
      </div>

      {/* Datatable with High Contrast Dark Mode */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed border-collapse min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <tr>
                {renderSortHeader("Pengirim & Kontak", "nama", "w-[24%]")}
                {renderSortHeader("Subjek & Isu Pesan", "subjek", "w-[38%]")}
                {renderSortHeader("Tanggal Masuk", "createdAt", "w-[15%]")}
                {renderSortHeader("Status", "isRead", "w-[11%]")}
                <th className="p-3.5 text-right w-[12%] font-extrabold uppercase text-slate-900 dark:text-white text-[11px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Memuat daftar pesan...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Belum ada pesan kontak masuk.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      !item.isRead 
                        ? "bg-cyan-50/40 dark:bg-cyan-950/20 font-medium hover:bg-cyan-50/70 dark:hover:bg-cyan-950/30" 
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    {/* Pengirim & Kontak */}
                    <td className="p-3.5 overflow-hidden">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate flex items-center gap-1" title={item.nama}>
                        <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="truncate">{item.nama}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate flex items-center gap-1 mt-0.5" title={item.email}>
                        <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="truncate">{item.email}</span>
                      </p>
                    </td>

                    {/* Subjek & Isu Pesan */}
                    <td className="p-3.5 overflow-hidden">
                      <span className="font-bold text-slate-900 dark:text-white block text-xs truncate mb-0.5" title={item.subjek}>
                        {item.subjek}
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2 leading-relaxed break-words">
                        {item.pesan}
                      </p>
                    </td>

                    {/* Tanggal Masuk */}
                    <td className="p-3.5 whitespace-nowrap overflow-hidden">
                      <span className="text-slate-500 dark:text-slate-300 text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 whitespace-nowrap overflow-hidden">
                      {item.isRead ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-[10px]">
                          DIBACA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 font-bold text-[10px]">
                          BARU
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => handleMarkAsRead(item.id, item.isRead)}
                        className={`p-1.5 rounded-xl transition-colors ${
                          item.isRead 
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200" 
                            : "bg-cyan-50 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-600 hover:text-white"
                        }`}
                        title={item.isRead ? "Tandai Belum Dibaca" : "Tandai Sudah Dibaca"}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openReplyModal(item)}
                        className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-300 hover:text-white transition-colors"
                        title="Balas via Email"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(item.id)}
                        className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/40 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white transition-colors"
                        title="Hapus Pesan"
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

        {/* High-Contrast Interactive Pagination Footer */}
        {!loading && totalItems > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold">
              Menampilkan <span className="font-extrabold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> -{" "}
              <span className="font-extrabold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari{" "}
              <span className="font-extrabold text-slate-900 dark:text-white">{totalItems}</span> pesan
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
                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
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

      {/* Reply Modal */}
      {/* overflow-y-auto di sini, BUKAN items-center - dialog panjang di HP kecil butuh bisa digulung sampai ke tombol paling atas/bawah. */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Balas Pesan Kontak
              </h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 bg-cyan-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-cyan-200 dark:border-slate-700">
              <p><strong className="text-slate-900 dark:text-white">Kepada:</strong> {selectedItem.nama} ({selectedItem.email})</p>
              <p><strong className="text-slate-900 dark:text-white">Subjek:</strong> {selectedItem.subjek}</p>
              <p className="pt-1 border-t border-cyan-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 italic">"{selectedItem.pesan}"</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Draf Balasan Email</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                placeholder="Tuliskan jawaban atau konfirmasi tanggapan Anda di sini..."
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
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim via App Email</span>
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
