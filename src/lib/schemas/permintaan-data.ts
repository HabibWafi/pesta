import * as z from "zod";

/** Format penyerahan data yang diminta pemohon. */
export const FORMAT_DATA = ["SOFT_FILE", "HARD_COPY", "KUNJUNGAN_LANGSUNG"] as const;
export type FormatData = (typeof FORMAT_DATA)[number];

export const FORMAT_DATA_LABEL: Record<FormatData, string> = {
  SOFT_FILE: "Berkas digital (soft file)",
  HARD_COPY: "Cetak (hard copy)",
  KUNJUNGAN_LANGSUNG: "Datang langsung ke kantor",
};

/**
 * Skema permintaan data statistik ke kantor.
 *
 * SATU-SATUNYA definisi. Diimpor bersama oleh PermintaanDataModal, oleh
 * /api/permintaan-data, DAN oleh alur formulir bot WhatsApp Beregam - satu
 * permohonan yang masuk lewat kanal mana pun divalidasi dengan aturan yang
 * sama persis sebelum tersimpan.
 */
export const permintaanDataSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  instansi: z.string().trim().min(2, "Asal instansi minimal 2 karakter"),
  alamat: z.string().trim().min(3, "Alamat minimal 3 karakter"),
  noHp: z.string().trim().min(6, "Nomor HP/WA tidak valid"),
  email: z.string().trim().email("Format email tidak valid"),
  jenisData: z.string().trim().min(3, "Sebutkan data yang Anda butuhkan"),
  keperluan: z.string().trim().min(5, "Uraian keperluan minimal 5 karakter"),
  formatDiinginkan: z.enum(FORMAT_DATA).default("SOFT_FILE"),
  catatan: z.string().trim().max(1000, "Catatan maksimal 1000 karakter").optional().or(z.literal("")),
});

export type PermintaanDataInput = z.output<typeof permintaanDataSchema>;
export type PermintaanDataFormData = z.input<typeof permintaanDataSchema>;
