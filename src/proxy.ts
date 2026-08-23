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
/**
 * Halaman admin TIDAK BOLEH disimpan cache siapa pun.
 *
 * Ini bukan sekadar soal kerahasiaan. Halaman login sempat ter-cache
 * `s-maxage=31536000` - SATU TAHUN - karena isinya statis, sehingga Next
 * menganggapnya aman dipraproses. Akibatnya peramban memegang HTML dari
 * build lama, sementara nama berkas JavaScript berubah tiap build dan yang
 * lama dihapus. Petugas membuka halaman login lalu melihat teks tanpa gaya
 * yang menggantung selamanya, karena CSS dan JS-nya 404.
 *
 * Yang membuatnya sulit: pemulih chunk otomatis pun tidak bisa menolong,
 * sebab kodenya ikut berada di JavaScript yang gagal dimuat itu. Satu-
 * satunya obat adalah tidak pernah menyajikan HTML admin yang basi.
 */
function tanpaCache(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(getAdminTokenCookieName())?.value;
  const sesi = token ? verifyAdminToken(token) : null;

  /*
   * Halaman login harus tetap bisa diakses tanpa sesi - tapi yang SUDAH
   * punya sesi tidak perlu melihatnya sama sekali.
   *
   * Dulu pengalihan itu dikerjakan di browser: halaman login memanggil
   * /api/auth/me lalu router.replace(). Selama menunggu, yang tampil adalah
   * "Memeriksa Sesi Login..." - dan bila JavaScript-nya gagal dimuat, teks
   * itu menggantung selamanya karena tidak ada yang mengubahnya. Sesi sudah
   * diverifikasi di sini, jadi tidak ada alasan menunda keputusannya sampai
   * ke browser.
   */
  if (pathname === "/admin/login") {
    if (sesi) {
      const tujuan = req.nextUrl.clone();
      // Kembalikan ke halaman yang tadi dituju, bila ada.
      const lanjut = req.nextUrl.searchParams.get("lanjut");
      tujuan.pathname = lanjut?.startsWith("/admin") ? lanjut : "/admin/dashboard";
      tujuan.search = "";
      return tanpaCache(NextResponse.redirect(tujuan));
    }
    return tanpaCache(NextResponse.next());
  }

  if (!sesi) {
    const tujuan = req.nextUrl.clone();
    tujuan.pathname = "/admin/login";
    // Simpan halaman yang dituju supaya bisa dikembalikan setelah login.
    if (pathname !== "/admin") {
      tujuan.searchParams.set("lanjut", pathname);
    }
    return tanpaCache(NextResponse.redirect(tujuan));
  }

  /*
   * Sudah login dan membuka /admin - langsung antar ke dashboard dari sini.
   *
   * Dulu pengalihan ini dikerjakan di browser (halaman /admin memanggil
   * /api/auth/me lalu router.replace). Akibatnya browser harus mengambil
   * berkas JavaScript halaman dashboard lebih dulu, dan sesaat setelah
   * deploy berkas itu bisa saja sudah dihapus - petugas melihat layar galat
   * alih-alih panelnya. Di sini sesinya sudah diverifikasi, jadi tujuannya
   * sudah pasti dan tidak ada alasan menunda keputusan itu sampai ke browser.
   */
  if (pathname === "/admin") {
    const tujuan = req.nextUrl.clone();
    tujuan.pathname = "/admin/dashboard";
    return tanpaCache(NextResponse.redirect(tujuan));
  }

  return tanpaCache(NextResponse.next());
}
