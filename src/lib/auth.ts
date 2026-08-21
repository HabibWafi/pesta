import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const TOKEN_COOKIE_NAME = "pesta_admin_token";

/**
 * Ambil JWT_SECRET dari environment.
 *
 * Sengaja TIDAK ada nilai cadangan yang di-hardcode. Nilai cadangan di dalam
 * kode berarti siapa pun yang bisa membaca repositori dapat menandatangani
 * token administrator sendiri bila JWT_SECRET lupa diisi di server.
 * Lebih baik aplikasi gagal dengan pesan jelas daripada jalan dengan kunci
 * yang sudah diketahui publik.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET belum diatur atau terlalu pendek (minimal 32 karakter). " +
        "Isi di .env dengan hasil perintah: openssl rand -hex 32"
    );
  }
  return secret;
}

export interface AdminPayload {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  // Dipanggil di luar try: salah konfigurasi harus terlihat sebagai error,
  // bukan tersamar jadi "token tidak valid".
  const secret = getJwtSecret();
  try {
    return jwt.verify(token, secret) as AdminPayload;
  } catch {
    // Token kedaluwarsa, rusak, atau tanda tangannya tidak cocok.
    return null;
  }
}

export async function getAdminSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function getAdminTokenCookieName(): string {
  return TOKEN_COOKIE_NAME;
}
