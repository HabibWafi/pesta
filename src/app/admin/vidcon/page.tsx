"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Download,
  Video, 
  Search, 
  Filter,
  Trash2,
  Edit3,
  X,
  Clock,
  Calendar,
  Phone,
  Building,
  MessageCircle,
  Globe,
  Send,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { VidconRequest } from "@/lib/db/schema";
import { labelInklusif } from "@/lib/schemas/inklusi";

type SortField = "nama" | "cakupan" | "tanggal" | "status";
type SortOrder = "asc" | "desc";

export default function AdminVidconPage() {
  const [items, setItems] = useState<VidconRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<VidconRequest | null>(null);
  const [editStatus, setEditStatus] = useState("APPROVED");
  const [catatan, setCatatan] = useState("");
  const [updating, setUpdating] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("tanggal");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Custom Delete Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  /*
   * Proses & kirim undangan ViDCon lewat WhatsApp.
   *
   * Selalu lewat PRATINJAU lebih dulu. Undangan ini keluar atas nama BPS
   * dan berisi jadwal serta tautan rapat - petugas harus melihat persis apa
   * yang akan diterima warga sebelum menekan kirim, bukan menekan tombol
   * lalu berharap isinya benar.
   */
  const [proses, setProses] = useState<VidconRequest | null>(null);
  const [pratinjau, setPratinjau] = useState<{ nomorWa: string; pesan: string; sudahDiproses: boolean } | null>(null);
  const [galatPratinjau, setGalatPratinjau] = useState<string | null>(null);
  const [memuatPratinjau, setMemuatPratinjau] = useState(false);
  const [mengirim, setMengirim] = useState(false);

  // Jadwal yang akan dipakai undangan. Petugas boleh menawarkan jadwal lain
  // daripada yang diminta warga - jam yang diminta bisa bentrok atau di luar
  // jam layanan.
  const [jadwalTanggal, setJadwalTanggal] = useState("");
  const [jadwalJam, setJadwalJam] = useState("");

  const muatPratinjau = async (item: VidconRequest, tanggal: string, jam: string) => {
    setMemuatPratinjau(true);
    setGalatPratinjau(null);
    try {
      const q = new URLSearchParams({ tanggal, jam });
      const res = await fetch(`/api/admin/vidcon/${item.id}/proses?${q}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPratinjau(null);
        setGalatPratinjau(data.message || "Gagal menyiapkan undangan");
      } else {
        setPratinjau({ nomorWa: data.nomorWa, pesan: data.pesan, sudahDiproses: data.sudahDiproses });
      }
    } catch {
      setPratinjau(null);
      setGalatPratinjau("Terjadi kendala jaringan saat menyiapkan undangan.");
    } finally {
      setMemuatPratinjau(false);
    }
  };

  const bukaProses = (item: VidconRequest) => {
    setProses(item);
    setPratinjau(null);
    setGalatPratinjau(null);
    setJadwalTanggal(item.tanggal);
    setJadwalJam(item.jam);
    void muatPratinjau(item, item.tanggal, item.jam);
  };

  /** Jadwal diubah petugas: pratinjau ikut disegarkan supaya isinya tidak tertinggal. */
  const ubahJadwal = (tanggal: string, jam: string) => {
    setJadwalTanggal(tanggal);
    setJadwalJam(jam);
    if (proses && tanggal && jam) void muatPratinjau(proses, tanggal, jam);
  };

  const kirimUndangan = async () => {
    if (!proses) return;
    setMengirim(true);
    try {
      const res = await fetch(`/api/admin/vidcon/${proses.id}/proses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal: jadwalTanggal, jam: jadwalJam }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success("Undangan ViDCon Terkirim", { description: data.message });
      setProses(null);
      fetchVidcon();
    } catch (err) {
      toast.error("Gagal Mengirim Undangan", {
        description: err instanceof Error ? err.message : "Terjadi kendala jaringan.",
      });
    } finally {
      setMengirim(false);
    }
  };

  const jadwalBerubah =
    Boolean(proses) && (jadwalTanggal !== proses?.tanggal || jadwalJam !== proses?.jam);

  const fetchVidcon = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.append("status", statusFilter);
      if (search) query.append("q", search);

      const res = await fetch(`/api/admin/vidcon?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      toast.error("Gagal Memuat Data", {
        description: "Terjadi kendala saat mengambil daftar permohonan ViDCon.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVidcon();
    setCurrentPage(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchVidcon();
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
    // Semua medan sortir di halaman ini bertipe teks (nama, cakupan,
    // tanggal sebagai string YYYY-MM-DD, status), jadi cukup dibandingkan
    // sebagai teks tanpa peka huruf besar-kecil.
    const kunci = (item: VidconRequest): string =>
      String(item[sortField] ?? "").toLowerCase();

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

  const openEditModal = (item: any) => {
    setSelectedItem(item);
    setEditStatus(item.status);
    setCatatan(item.catatanAdmin || "");
  };

  const handleUpdateStatus = async () => {
    if (!selectedItem) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/vidcon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedItem.id,
          status: editStatus,
          catatanAdmin: catatan,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success("Status Permohonan Berhasil Diperbarui", {
        description: `Permohonan atas nama ${selectedItem.nama} telah disesuaikan menjadi ${editStatus}.`,
      });
      setSelectedItem(null);
      fetchVidcon();
    } catch (err: any) {
      toast.error("Gagal Memperbarui Permohonan", {
        description: err.message || "Mohon periksa kembali isian data Anda.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/vidcon?id=${deleteTargetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success("Permohonan Berhasil Dihapus", {
        description: "Data permohonan ViDCon telah berhasil dihapus dari daftar layanan.",
      });
      setDeleteTargetId(null);
      fetchVidcon();
    } catch (err: any) {
      toast.error("Gagal Menghapus Data", {
        description: err.message || "Terjadi kendala saat menghapus data permohonan.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold text-[10px]">PENDING</span>;
      case "APPROVED":
        return <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 font-bold text-[10px]">DISETUJUI</span>;
      case "COMPLETED":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold text-[10px]">SELESAI</span>;
      case "REJECTED":
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
      {/* Custom Confirmation Popup Modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Permohonan ViDCon?"
        message="Apakah Anda yakin ingin menghapus data permohonan ini? Data yang dihapus tidak dapat dikembalikan."
        confirmText="Ya, Hapus Permohonan"
        cancelText="Batal"
        variant="danger"
        loading={deleting}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Video className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Kelola Permohonan ViDCon
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Daftar permohonan konsultasi statistik virtual BPS Musi Rawas (Total: {totalItems} Permohonan)
          </p>
        </div>

        <a
          href="/api/admin/ekspor?jenis=vidcon"
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
            placeholder="Cari nama, instansi, email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
            <option value="APPROVED">Disetujui</option>
            <option value="COMPLETED">Selesai</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Datatable with High Contrast Dark Mode */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed border-collapse min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <tr>
                {renderSortHeader("Pemohon", "nama", "w-[24%]")}
                {renderSortHeader("Topik & Deskripsi", "cakupan", "w-[38%]")}
                {renderSortHeader("Jadwal ViDCon", "tanggal", "w-[15%]")}
                {renderSortHeader("Status", "status", "w-[11%]")}
                <th className="p-3.5 text-right w-[12%] font-extrabold uppercase text-slate-900 dark:text-white text-[11px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Memuat daftar permohonan...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Belum ada data permohonan ViDCon.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    {/* Pemohon */}
                    <td className="p-3.5 overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900 dark:text-white text-xs truncate" title={item.nama}>
                          {item.nama}
                        </p>
                        {/*
                          Dibaca dari kolom layanan_inklusif, bukan ditebak
                          dari teks deskripsi. Tebakan lama itu penanganan
                          darurat karena isian aslinya tidak pernah sampai
                          ke database.
                        */}
                        {getSumberBadge(item.sumber)}
                        {labelInklusif(item.layananInklusif).map((label) => (
                          <span
                            key={label}
                            className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[9px] border border-emerald-300"
                            title="Permohonan ini meminta pendampingan inklusif - beri prioritas"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300 truncate mt-0.5" title={item.asalInstansi}>
                        <Building className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">{item.asalInstansi}</span>
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300 truncate mt-0.5" title={item.noHp}>
                        <Phone className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">{item.noHp}</span>
                      </p>
                    </td>

                    {/* Topik & Deskripsi */}
                    <td className="p-3.5 overflow-hidden">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 block text-xs truncate mb-0.5" title={item.cakupan}>
                        {item.cakupan}
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2 leading-relaxed break-words">
                        {item.deskripsi}
                      </p>
                    </td>

                    {/* Jadwal ViDCon */}
                    <td className="p-3.5 whitespace-nowrap overflow-hidden space-y-0.5">
                      <p className="font-semibold text-slate-900 dark:text-white text-[11px] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" /> {item.tanggal}
                      </p>
                      <p className="text-slate-500 dark:text-slate-300 text-[11px] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" /> {item.jam} WIB
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 whitespace-nowrap overflow-hidden">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => bukaProses(item)}
                        className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-emerald-600 dark:text-emerald-300 hover:text-white transition-colors"
                        title="Proses: kirim undangan ViDCon lewat WhatsApp"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-300 hover:text-white transition-colors"
                        title="Ubah Status / Balas"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(item.id)}
                        className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/40 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white transition-colors"
                        title="Hapus Permohonan"
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
              <span className="font-extrabold text-slate-900 dark:text-white">{totalItems}</span> permohonan
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
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
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

      {/* Proses & kirim undangan ViDCon */}
      {proses && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Kirim Undangan ViDCon
                </h3>
                <button onClick={() => setProses(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {memuatPratinjau && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan undangan...
                </div>
              )}

              {galatPratinjau && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {galatPratinjau}
                </div>
              )}

              {/*
                Jadwal bisa diatur ulang di sini. Yang diubah bukan cuma isi
                undangan - baris permohonannya ikut diperbarui saat dikirim,
                supaya panel dan WhatsApp warga tidak pernah menyebut jam
                yang berbeda.
              */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Jadwal konsultasi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={jadwalTanggal}
                    onChange={(e) => ubahJadwal(e.target.value, jadwalJam)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="time"
                    step={300}
                    value={jadwalJam}
                    onChange={(e) => ubahJadwal(jadwalTanggal, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {jadwalBerubah ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    Jadwal diubah dari permintaan warga ({proses.tanggal} pukul {proses.jam}).
                    Undangan dan data permohonan akan memakai jadwal baru ini.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Sesuai permintaan warga. Ubah bila jamnya bentrok atau di luar jam layanan.
                  </p>
                )}
              </div>

              {pratinjau && (
                <>
                  {pratinjau.sudahDiproses && (
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      Permohonan ini <strong>sudah pernah diproses</strong>. Mengirim lagi akan
                      membuat warga menerima undangan kedua.
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Dikirim ke WhatsApp{" "}
                    <strong className="text-slate-900 dark:text-white">+{pratinjau.nomorWa}</strong>{" "}
                    lewat bot Beregam. Beginilah pesan yang akan diterima warga:
                  </p>

                  {/* Pratinjau ditulis dengan latar gelap seperti gelembung chat supaya
                      petugas membacanya sebagaimana warga akan membacanya. */}
                  <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 text-[11px] leading-relaxed whitespace-pre-wrap font-mono max-h-72 overflow-y-auto border border-slate-700">
                    {pratinjau.pesan}
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Naskah dan tautan Zoom bisa diubah di Kelola Konten &rsaquo; ViDCon.
                  </p>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setProses(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  onClick={kirimUndangan}
                  disabled={!pratinjau || mengirim}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {mengirim ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {mengirim ? "Mengirim..." : "Kirim & Setujui"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Status Modal - overflow-y-auto di sini, BUKAN items-center, supaya dialog panjang di HP kecil tetap bisa digulung sampai ke tombol paling atas/bawah. */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Ubah Status ViDCon</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p><strong className="text-slate-900 dark:text-white">Pemohon:</strong> {selectedItem.nama} ({selectedItem.asalInstansi})</p>
              <p><strong className="text-slate-900 dark:text-white">Kontak:</strong> {selectedItem.email} &middot; {selectedItem.noHp}</p>
              <p><strong className="text-slate-900 dark:text-white">Alamat:</strong> {selectedItem.alamat}</p>
              <p><strong className="text-slate-900 dark:text-white">Jadwal:</strong> {selectedItem.tanggal} jam {selectedItem.jam} WIB</p>
              <p><strong className="text-slate-900 dark:text-white">Topik:</strong> {selectedItem.cakupan}</p>
              {labelInklusif(selectedItem.layananInklusif).length > 0 && (
                <p className="pt-1 mt-1 border-t border-slate-200 dark:border-slate-700">
                  <strong className="text-emerald-700 dark:text-emerald-400">Pendampingan inklusif:</strong>{" "}
                  {labelInklusif(selectedItem.layananInklusif).join(", ")}
                  {selectedItem.layananInklusifCatatan ? ` - ${selectedItem.layananInklusifCatatan}` : ""}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Status Permohonan</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none"
              >
                <option value="PENDING">PENDING (Menunggu Verifikasi)</option>
                <option value="APPROVED">DISETUJUI (Jadwal Terkonfirmasi)</option>
                <option value="COMPLETED">SELESAI (Konsultasi Berhasil)</option>
                <option value="REJECTED">DITOLAK (Jadwal Penuh/Bentrokan)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Catatan Petugas / Link Zoom</label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
                placeholder="Tuliskan link pertemuan virtual atau penjelasan petugas BPS..."
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
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
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
