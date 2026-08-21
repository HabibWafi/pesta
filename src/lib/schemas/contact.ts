import * as z from "zod";

/**
 * Skema pesan kontak cepat ke PST.
 *
 * SATU-SATUNYA definisi. Diimpor bersama oleh ContactSection dan
 * /api/contact.
 */
export const contactSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().email("Format email tidak valid"),
  subjek: z.string().trim().min(3, "Subjek minimal 3 karakter"),
  pesan: z.string().trim().min(10, "Pesan minimal 10 karakter"),
});

export type ContactInput = z.output<typeof contactSchema>;
export type ContactFormData = z.input<typeof contactSchema>;
