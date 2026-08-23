import * as z from "zod";
import { layananInklusifSchema } from "./inklusi";

/**
 * Skema permohonan ViDCon.
 *
 * SATU-SATUNYA definisi. Diimpor bersama oleh VidconModal dan
 * /api/vidcon - jangan pernah mendefinisikan ulang di berkas lain.
 *
 * Mendefinisikan ulang skema di tiap berkas adalah penyebab bug
 * `layananInklusif`: form punya isiannya, tetapi skema form tidak
 * mendaftarkannya, sehingga zodResolver MEMBUANG nilai itu diam-diam.
 * Warga mengisi kebutuhan pendampingannya, tidak ada error apa pun,
 * dan petugas tidak pernah melihatnya.
 */
export const vidconSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  instansi: z.string().trim().min(2, "Asal instansi minimal 2 karakter"),
  alamat: z.string().trim().min(3, "Alamat minimal 3 karakter"),
  noHp: z.string().trim().min(6, "Nomor HP/WA tidak valid"),
  email: z.string().trim().email("Format email tidak valid"),
  topik: z.string().trim().min(2, "Pilih cakupan/topik konsultasi"),
  deskripsi: z.string().trim().min(10, "Uraian deskripsi minimal 10 karakter"),
  tanggal: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal konsultasi"),

  /**
   * Jam bebas sampai satuan menit, bukan lagi lima pilihan tetap.
   *
   * Sebelumnya hanya tersedia 08:30, 09:30, 10:30, 13:30, dan 14:30. Warga
   * yang hanya bisa pukul 10.00 terpaksa memilih jam yang sebenarnya tidak
   * cocok, lalu menegosiasikannya ulang lewat telepon - dan jadwal di
   * sistem berbeda dari yang sebenarnya disepakati.
   *
   * Divalidasi bentuknya saja (HH:MM 24 jam), bukan dibatasi jam layanan:
   * petugas tetap bisa menyesuaikan jadwalnya saat memproses permohonan,
   * jadi menolak permintaan di sini hanya menambah hambatan tanpa menambah
   * kepastian.
   */
  jam: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pilih jam konsultasi (format 24 jam, mis. 09:30)"),

  /** Kebutuhan pendampingan inklusif. Lihat ./inklusi.ts */
  layananInklusif: layananInklusifSchema,
  /** Penjelasan bebas bila memilih LAINNYA. */
  layananInklusifCatatan: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
});

/** Nilai setelah divalidasi dan ditransformasi (dipakai di sisi server). */
export type VidconInput = z.output<typeof vidconSchema>;

/** Nilai mentah dari form (dipakai react-hook-form di sisi klien). */
export type VidconFormData = z.input<typeof vidconSchema>;
