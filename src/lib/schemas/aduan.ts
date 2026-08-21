import * as z from "zod";

/** Pilihan jenis kelamin. Kosong berarti tidak ingin menyebutkan. */
export const JENIS_KELAMIN = ["", "Laki-laki", "Perempuan"] as const;

/**
 * Skema aduan publik (kanal internal PESTA).
 *
 * SATU-SATUNYA definisi. Diimpor bersama oleh PengaduanModal dan
 * /api/pengaduan.
 *
 * Sebelumnya form hanya punya satu isian "kontak" yang disimpan ke kolom
 * `email`. Akibatnya warga yang mengisi nomor HP membuat nomornya tersimpan
 * sebagai alamat email - petugas lalu mencoba membalas ke alamat yang tidak
 * pernah ada. Sekarang email dan nomor HP dipisah, dan tiga kolom yang sudah
 * lama ada di database (jenis kelamin, no HP, asal instansi) akhirnya terpakai.
 */
export const aduanSchema = z.object({
  nama: z.string().trim().min(2, "Nama pelapor atau 'Anonim' harus diisi"),

  email: z.string().trim().email("Format email tidak valid"),

  /** Opsional: sebagian warga hanya ingin dihubungi lewat email. */
  noHp: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]*$/, "Nomor HP hanya boleh berisi angka dan tanda + - ( )")
    .max(50, "Nomor HP terlalu panjang")
    .optional()
    .or(z.literal("")),

  jenisKelamin: z.enum(JENIS_KELAMIN).optional().or(z.literal("")),

  asalInstansi: z
    .string()
    .trim()
    .max(255, "Asal instansi terlalu panjang")
    .optional()
    .or(z.literal("")),

  kategori: z.string().trim().min(1, "Pilih kategori aduan"),

  detail: z.string().trim().min(15, "Uraian aduan minimal 15 karakter"),
});

export type AduanInput = z.output<typeof aduanSchema>;
export type AduanFormData = z.input<typeof aduanSchema>;
