import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken, getAdminTokenCookieName } from "@/lib/auth";

/**
 * Menjaga seluruh halaman admin di sisi SERVER.
 *
 * Sebelum ini, proteksinya hanya di browser: src/app/admin/layout.tsx
 * memanggil /api/auth/me lewat useEffect lalu mengalihkan bila gagal.
 * Artinya isi halaman admin sempat ter-render dan terlihat sekejap sebelum
 * pengunjung ditendang - dan siapa pun yang mematikan JavaScript bisa
 * membacanya dengan tenang.
 *
 * Route /api/admin/* tidak diikutkan di sini karena masing-masing sudah
 * memanggil getAdminSession() sendiri. Membiarkan pemeriksaan itu tetap di
 * route handler lebih baik: kalau suatu saat berkas ini diubah atau
 * dilewati, endpoint-nya tetap terlindungi.
 *
 * Berkas ini memakai konvensi `proxy` milik Next 16; `middleware` yang lama
 * sudah ditandai usang.
 */
export const config = {
  matcher: ["/admin/:path*"],
};

/**
 * Proxy selalu berjalan di runtime Node.js dan tidak menerima ekspor
 * `runtime`. Itu justru menguntungkan di sini: jsonwebtoken memakai modul
 * crypto Node, jadi verifikasi token bisa dilakukan langsung tanpa perlu
 * mengganti pustaka.
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Halaman login harus tetap bisa diakses tanpa sesi.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(getAdminTokenCookieName())?.value;
  const sesi = token ? verifyAdminToken(token) : null;

  if (!sesi) {
    const tujuan = req.nextUrl.clone();
    tujuan.pathname = "/admin/login";
    // Simpan halaman yang dituju supaya bisa dikembalikan setelah login.
    if (pathname !== "/admin") {
      tujuan.searchParams.set("lanjut", pathname);
    }
    return NextResponse.redirect(tujuan);
  }

  return NextResponse.next();
}
