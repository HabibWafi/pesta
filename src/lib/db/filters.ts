import { like, or, type SQL, type AnyColumn } from "drizzle-orm";

/** Karakter yang punya arti khusus di dalam pola LIKE MySQL. */
const WILDCARD_LIKE = /[\\%_]/g;

/**
 * Meloloskan karakter wildcard LIKE dari input pengguna.
 *
 * Tanpa ini, warga yang mencari "50%" akan mendapat hasil yang aneh karena
 * `%` diperlakukan sebagai "cocokkan apa saja", dan `_` sebagai "satu karakter
 * apa saja". Yang dicari orang adalah tanda itu secara harfiah.
 */
function escapeLike(value: string): string {
  // Dirangkai dengan concat, bukan template literal: backslash di dalam
  // template literal mudah salah tulis dan sulit terlihat saat ditinjau.
  return value.replace(WILDCARD_LIKE, (karakter) => "\\" + karakter);
}

/**
 * Membangun kondisi "salah satu kolom memuat teks ini".
 *
 * Menggantikan pola `where.OR = [{ kolom: { contains: q } }, ...]` milik
 * Prisma. Pencocokannya tetap tidak peka huruf besar-kecil karena kolomnya
 * memakai collation utf8mb4_unicode_ci.
 *
 * Mengembalikan undefined bila query kosong, sehingga aman langsung
 * dioper ke `.where()`.
 */
export function containsAny(
  query: string | null | undefined,
  columns: AnyColumn[]
): SQL | undefined {
  const trimmed = query?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${escapeLike(trimmed)}%`;
  return or(...columns.map((column) => like(column, pattern)));
}
