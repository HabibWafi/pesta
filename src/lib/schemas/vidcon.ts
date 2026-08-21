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
  tanggal: z.string().trim().min(8, "Pilih tanggal konsultasi"),
  jam: z.string().trim().min(4, "Pilih jam konsultasi"),

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
