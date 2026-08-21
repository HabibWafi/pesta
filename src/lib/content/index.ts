import { unstable_cache, revalidateTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { faqs, testimonials, type Faq, type Testimonial } from "@/lib/db/schema";

export * from "./settings";

/**
 * Isi landing page yang dikelola dari admin.
 *
 * Semua query di-cache dengan tag "konten". Halaman admin memanggil
 * segarkanKonten() setelah menyimpan, sehingga perubahan langsung terlihat
 * tanpa menunggu masa cache habis.
 */

/** Testimoni yang layak tayang, urut sesuai pengaturan admin. */
export const ambilTestimoni = unstable_cache(
  async (): Promise<Testimonial[]> => {
    try {
      return await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.isPublished, true))
        .orderBy(asc(testimonials.sortOrder), asc(testimonials.id));
    } catch (error) {
      console.error("Gagal membaca testimoni:", error);
      return [];
    }
  },
  ["testimoni-tayang"],
  { tags: ["konten"], revalidate: 300 }
);

/** FAQ yang layak tayang, urut sesuai pengaturan admin. */
export const ambilFaq = unstable_cache(
  async (): Promise<Faq[]> => {
    try {
      return await db
        .select()
        .from(faqs)
        .where(eq(faqs.isPublished, true))
        .orderBy(asc(faqs.sortOrder), asc(faqs.id));
    } catch (error) {
      console.error("Gagal membaca FAQ:", error);
      return [];
    }
  },
  ["faq-tayang"],
  { tags: ["konten"], revalidate: 300 }
);

/**
 * Dipanggil setelah admin menyimpan perubahan konten.
 *
 * `{ expire: 0 }` membuat cache langsung kedaluwarsa, bukan menunggu sisa
 * masa berlaku. Sejak Next 16 argumen profil ini wajib diisi.
 */
export function segarkanKonten(): void {
  revalidateTag("konten", { expire: 0 });
}
