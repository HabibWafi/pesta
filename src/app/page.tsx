import HomeClient from "@/components/HomeClient";
import { ambilPengaturan, ambilTestimoni, ambilFaq, aktif } from "@/lib/content";
import { komponenWib } from "@/lib/waktu";

/**
 * Halaman utama PESTA.
 *
 * Server Component: isi halaman diambil dari database di server, lalu dioper
 * ke HomeClient sebagai props. Dengan begitu konten tetap ada di HTML sumber
 * dan bisa dibaca mesin pencari maupun pembaca layar - tidak dimuat belakangan
 * lewat fetch dari browser.
 *
 * Seluruh query di lib/content di-cache dengan tag "konten" agar tiap
 * pengunjung tidak memukul MySQL. Ini penting karena Hostinger Business
 * membatasi jumlah Entry Process.
 */
export default async function Home() {
  const [pengaturan, testimoni, faq] = await Promise.all([
    ambilPengaturan(),
    ambilTestimoni(),
    ambilFaq(),
  ]);

  return (
    <HomeClient
      konten={{
        pengaturan,
        testimoni,
        faq,
        tampilTestimoni: aktif(pengaturan["tampilan.testimoni"]),
        tampilFaq: aktif(pengaturan["tampilan.faq"]),
        tampilPeta: aktif(pengaturan["tampilan.peta"]),
        tampilInklusi: aktif(pengaturan["tampilan.inklusi"]),
        googleMapsKey: process.env.GOOGLE_MAPS_EMBED_KEY ?? "",
        /**
         * Tahun berjalan menurut WIB, untuk label Survei Kebutuhan Data.
         *
         * Dihitung DI SERVER lalu dioper ke bawah, bukan dipanggil langsung di
         * komponen klien. Kalau dihitung di dua tempat, halaman yang dirender
         * server tepat sebelum pergantian tahun akan berbeda dari yang
         * dihidrasi peramban sesudahnya, dan React melaporkannya sebagai
         * ketidakcocokan hidrasi. Satu nilai, satu sumber.
         *
         * Halaman ini divalidasi ulang tiap 5 menit, jadi labelnya ikut
         * berganti sendiri paling lama 5 menit setelah tahun baru - tanpa
         * perlu ada yang menyunting kode.
         */
        tahunSkd: komponenWib().tahun,
      }}
    />
  );
}
