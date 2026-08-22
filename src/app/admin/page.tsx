import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";

/**
 * Pintu masuk /admin - hanya mengalihkan, tidak menggambar apa pun.
 *
 * SENGAJA Server Component, bukan client. Versi sebelumnya adalah client
 * component yang memanggil /api/auth/me lalu router.replace() ke tujuannya,
 * dan itu punya satu kelemahan yang baru terasa saat situs di-deploy ulang:
 * router.replace() adalah navigasi sisi klien, jadi browser harus mengambil
 * berkas JavaScript halaman tujuan lebih dulu. Kalau berkas itu milik versi
 * lama yang sudah dihapus server, yang muncul justru layar galat - padahal
 * pengunjungnya cuma ingin membuka panel admin.
 *
 * Mengalihkan di server menghapus seluruh rantai itu: tidak ada halaman yang
 * dirender, tidak ada permintaan /api/auth/me, tidak ada navigasi sisi klien,
 * dan tidak ada satu pun berkas JavaScript yang perlu diambil. Sekaligus
 * lebih cepat - satu pengalihan, bukan muat halaman lalu panggil API lalu
 * pindah halaman lagi.
 *
 * src/proxy.ts sudah mengalihkan lebih awal lagi, sebelum apa pun dirender.
 * Berkas ini tetap dipertahankan sebagai lapis kedua, mengikuti kebiasaan
 * proyek ini: kalau proxy suatu saat diubah atau dilewati, perilakunya tetap
 * benar dan bukan halaman kosong.
 */
export default async function AdminIndexPage() {
  const sesi = await getAdminSession();
  redirect(sesi ? "/admin/dashboard" : "/admin/login");
}
