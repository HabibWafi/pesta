"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Download,
  ShieldAlert, 
  Search, 
  Filter, 
  Trash2, 
  X, 
  Mail, 
  User, 
  MessageSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  Send,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { Pengaduan } from "@/lib/db/schema";

type SortField = "nama" | "kategori" | "createdAt" | "status";
type SortOrder = "asc" | "desc";

// Helper: Detect if a contact string is an email or phone number
function isEmailKontak(kontak: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kontak.trim());
}

// Helper: Format phone number for WhatsApp link (strip leading 0, add 62)
function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]+/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  }
  return cleaned;
}

export default function AdminPengaduanPage() {
  const [items, setItems] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<Pengaduan | null>(null);
  const [editStatus, setEditStatus] = useState("RESOLVED");
  const [tanggapan, setTanggapan] = useState("");
  const [updating, setUpdating] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Custom Delete Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPengaduan = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.append("status", statusFilter);
      if (search) query.append("q", search);

      const res = await fetch(`/api/admin/pengaduan?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      toast.error("Gagal Memuat Data", {
        description: "Terjadi kendala saat mengambil daftar pengaduan publik.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPengaduan();
    setCurrentPage(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPengaduan();
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
    const kunci = (item: Pengaduan): number | string =>
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

  const openModal = (item: any) => {
    setSelectedItem(item);
    setEditStatus(item.status);
    setTanggapan(item.tanggapan || "");
  };

  const handleUpdateStatus = async () => {
    if (!selectedItem) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/pengaduan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedItem.id,
          status: editStatus,
          tanggapan,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success("Tanggapan Pengaduan Berhasil Disimpan", {
        description: `Pengaduan dari ${selectedItem.nama} telah ditindaklanjuti.`,
      });
      setSelectedItem(null);
      fetchPengaduan();
    } catch (err: any) {
      toast.error("Gagal Memperbarui Pengaduan", {
        description: err.message || "Mohon periksa kembali isian data Anda.",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Send tanggapan via email (mailto:) or WhatsApp (wa.me/)
  const handleSendTanggapan = () => {
    if (!selectedItem || !tanggapan.trim()) return;
    const kontak = selectedItem.email; // field 'email' stores email or phone

    if (isEmailKontak(kontak)) {
      // Open mailto: link
      const subject = encodeURIComponent(`Tanggapan Pengaduan: ${selectedItem.kategori}`);
      const body = encodeURIComponent(
        `Yth. Sdr/i ${selectedItem.nama},\n\nTerima kasih atas pengaduan yang telah Anda sampaikan mengenai "${selectedItem.kategori}".\n\nBerikut tanggapan resmi dari BPS Kabupaten Musi Rawas:\n\n${tanggapan}\n\nHormat Kami,\nStaf Pelayanan BPS Kab. Musi Rawas`
      );
      window.open(`mailto:${kontak}?subject=${subject}&body=${body}`, "_blank");
      toast.success("Membuka Aplikasi Email", {
        description: `Tanggapan siap dikirim ke ${kontak}.`,
      });
    } else {
      // Open WhatsApp link
      const waNumber = formatWhatsAppNumber(kontak);
      const text = encodeURIComponent(
        `Yth. Sdr/i ${selectedItem.nama},\n\nTerima kasih atas pengaduan yang Anda sampaikan melalui website PESTA BPS Musi Rawas mengenai "${selectedItem.kategori}".\n\nBerikut tanggapan resmi kami:\n\n${tanggapan}\n\nHormat Kami,\nStaf Pelayanan BPS Kab. Musi Rawas`
      );
      window.open(`https://wa.me/${waNumber}?text=${text}`, "_blank");
      toast.success("Membuka WhatsApp", {
        description: `Tanggapan siap dikirim ke nomor ${kontak}.`,
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/pengaduan?id=${deleteTargetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success("Pengaduan Berhasil Dihapus", {
        description: "Data pengaduan publik telah dihapus dari sistem.",
      });
      setDeleteTargetId(null);
      fetchPengaduan();
    } catch (err: any) {
      toast.error("Gagal Menghapus Pengaduan", {
        description: err.message || "Terjadi kendala saat menghapus data pengaduan.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold text-[10px]">BELUM DIPROSES</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 font-bold text-[10px]">SEDANG DIPROSES</span>;
      case "RESOLVED":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold text-[10px]">SELESAI</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-bold text-[10px]">{status}</span>;
    }
  };

  // Render contact info with correct icon based on type (email vs phone)
  const renderKontakInfo = (kontak: string) => {
    if (isEmailKontak(kontak)) {
      return (
        <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate flex items-center gap-1 mt-0.5" title={kontak}>
          <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">{kontak}</span>
        </p>
      );
    } else {
      return (
        <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate flex items-center gap-1 mt-0.5" title={kontak}>
          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{kontak}</span>
        </p>
      );
    }
  };

  const renderSortHeader = (label: string, field: SortField, className = "") => (
    <th 
      onClick={() => handleSort(field)}
      className={`p-3.5 cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1 font-extrabold text-slate-900 dark:text-white uppercase text-[11px]">
        <span>{label}</span>
        {sortField === field ? (
          sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-60 shrink-0" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Pengaduan?"
        message="Apakah Anda yakin ingin menghapus data pengaduan ini? Data yang dihapus tidak dapat dipulihkan."
        confirmText="Ya, Hapus Pengaduan"
        cancelText="Batal"
        variant="danger"
        loading={deleting}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            Kelola Pengaduan Publik
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Daftar pengaduan mandiri & aspirasi pelayanan BPS Kabupaten Musi Rawas (Total: {totalItems} Laporan)
          </p>
        </div>

        <a
          href="/api/admin/ekspor?jenis=aduan"
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
            placeholder="Cari nama, email, kategori..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
            <option value="PENDING">Belum Diproses</option>
            <option value="IN_PROGRESS">Sedang Diproses</option>
            <option value="RESOLVED">Selesai (Resolved)</option>
          </select>
        </div>
      </div>

      {/* Datatable with High Contrast Dark Mode */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed border-collapse min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <tr>
                {renderSortHeader("Pelapor & Kontak", "nama", "w-[24%]")}
                {renderSortHeader("Kategori & Detail", "kategori", "w-[32%]")}
                <th className="p-3.5 w-[21%] font-extrabold uppercase text-slate-900 dark:text-white text-[11px]">Tanggapan Staf BPS</th>
                {renderSortHeader("Status", "status", "w-[11%]")}
                <th className="p-3.5 text-right w-[12%] font-extrabold uppercase text-slate-900 dark:text-white text-[11px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Memuat data pengaduan...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Belum ada data pengaduan publik.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    {/* Pelapor & Kontak */}
                    <td className="p-3.5 overflow-hidden">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate flex items-center gap-1" title={item.nama}>
                        <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="truncate">{item.nama}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate flex items-center gap-1 mt-0.5" title={item.email}>
                        <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="truncate">{item.email}</span>
                      </p>
                      {item.noHp && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate flex items-center gap-1 mt-0.5" title={item.noHp}>
                          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{item.noHp}</span>
                        </p>
                      )}
                      {item.asalInstansi && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate mt-0.5" title={item.asalInstansi}>
                          {item.asalInstansi}
                        </p>
                      )}
                    </td>

                    {/* Kategori & Detail */}
                    <td className="p-3.5 overflow-hidden">
                      <span className="font-bold text-amber-700 dark:text-amber-400 block text-xs truncate mb-0.5" title={item.kategori}>
                        {item.kategori}
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 text-[11px] line-clamp-2 leading-relaxed break-words">
                        {item.detail}
                      </p>
                    </td>

                    {/* Tanggapan Staf BPS */}
                    <td className="p-3.5 overflow-hidden">
                      {item.tanggapan ? (
                        <p className="text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-900/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] line-clamp-2 leading-relaxed">
                          {item.tanggapan}
                        </p>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Belum ada tanggapan</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 whitespace-nowrap overflow-hidden">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => openModal(item)}
                        className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/40 hover:bg-amber-600 dark:hover:bg-amber-600 text-amber-600 dark:text-amber-300 hover:text-slate-950 transition-colors"
                        title="Tindak Lanjuti / Tanggapi"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(item.id)}
                        className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/40 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white transition-colors"
                        title="Hapus Pengaduan"
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
              <span className="font-extrabold text-slate-900 dark:text-white">{totalItems}</span> pengaduan
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
                            ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
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

      {/* Response Modal — with Send via Email / WhatsApp */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Tindak Lanjuti Pengaduan</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-amber-200 dark:border-slate-700">
              <p><strong className="text-slate-900 dark:text-white">Pelapor:</strong> {selectedItem.nama}</p>
              <p className="flex items-center gap-1.5 flex-wrap">
                <strong className="text-slate-900 dark:text-white">Kontak:</strong>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold">
                  <Mail className="w-3 h-3" /> {selectedItem.email}
                </span>
                {selectedItem.noHp && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold">
                    <Phone className="w-3 h-3" /> {selectedItem.noHp}
                  </span>
                )}
              </p>
              {(selectedItem.asalInstansi || selectedItem.jenisKelamin) && (
                <p>
                  <strong className="text-slate-900 dark:text-white">Pelapor:</strong>{" "}
                  {[selectedItem.jenisKelamin, selectedItem.asalInstansi].filter(Boolean).join(" - ")}
                </p>
              )}
              <p><strong className="text-slate-900 dark:text-white">Kategori:</strong> {selectedItem.kategori}</p>
              <p><strong className="text-slate-900 dark:text-white">Detail:</strong> {selectedItem.detail}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Status Pengaduan</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none"
              >
                <option value="PENDING">BELUM DIPROSES</option>
                <option value="IN_PROGRESS">SEDANG DIPROSES</option>
                <option value="RESOLVED">SELESAI (RESOLVED)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Tanggapan / Balasan Resmi Staf BPS</label>
              <textarea
                value={tanggapan}
                onChange={(e) => setTanggapan(e.target.value)}
                rows={4}
                placeholder="Tuliskan tindakan atau penjelasan balasan untuk pelapor..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5">
              {/* Send Tanggapan via Email or WhatsApp */}
              {tanggapan.trim() && (
                <button
                  onClick={handleSendTanggapan}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all ${
                    isEmailKontak(selectedItem.email)
                      ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-800"
                      : "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {isEmailKontak(selectedItem.email) ? (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Tanggapan via Email</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </>
                  ) : (
                    <>
                      <Phone className="w-3.5 h-3.5" />
                      <span>Kirim Tanggapan via WhatsApp</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </>
                  )}
                </button>
              )}

              {/* Save & Cancel */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-1/3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="w-2/3 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {updating ? "Menyimpan..." : "Simpan Tanggapan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
