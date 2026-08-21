/**
 * Memindahkan konten landing yang semula di-hardcode ke database.
 *
 * Jalankan sekali:
 *   npm run db:seed:konten
 *
 * Aman diulang: FAQ dan pengaturan dicocokkan berdasarkan kuncinya,
 * jadi menjalankan dua kali tidak membuat baris kembar.
 *
 * TESTIMONI SENGAJA DISIMPAN TIDAK TAYANG.
 * Ketiga testimoni yang ada di kode memuat nama orang dan instansi yang
 * spesifik. Bila mereka tidak pernah menyatakan hal itu, menayangkannya
 * berarti memasang pujian yang dikarang atas nama pihak ketiga di situs
 * resmi instansi pemerintah. Isinya dibawa masuk sebagai bahan, dengan
 * isPublished = false dan catatan sumber yang harus diisi lebih dulu.
 */

import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db/index.js";
import { faqs, siteSettings, testimonials } from "../../src/lib/db/schema.js";
import { DEFINISI_SETTING } from "../../src/lib/content/settings.js";

const FAQ_AWAL = [
  {
    pertanyaan: "Apakah layanan ViDCon (Virtual Consultation) ini berbayar?",
    jawaban:
      "Tidak. Seluruh layanan ViDCon merupakan bagian dari komitmen Layanan Nol Rupiah BPS Kabupaten Musi Rawas dan diberikan secara 100% GRATIS kepada seluruh pengguna data dan stakeholder.",
  },
  {
    pertanyaan: "Apakah layanan ViDCon dapat diakses di luar jam kerja?",
    jawaban:
      "Permohonan pendaftaran jadwal ViDCon dapat diajukan kapan saja secara online (24/7). Namun, pelaksanaan sesi ViDCon bersama staf BPS berlangsung pada jam kerja resmi (Senin-Jumat, pukul 08.00 - 15.00 WIB).",
  },
  {
    pertanyaan: "Apa saja topik yang dapat dikonsultasikan melalui ViDCon?",
    jawaban:
      "Pengguna data dapat mengkonsultasikan berbagai topik statistik, antara lain: rilis indikator makro (sosial, ekonomi, kependudukan, inflasi), penjelasan konsep & definisi variabel, rekomendasi statistik sektoral, metodologi sensus/survei, serta bimbingan tugas akhir/penelitian mahasiswa.",
  },
  {
    pertanyaan: "Apakah layanan ViDCon khusus untuk instansi pemerintah saja?",
    jawaban:
      "Tidak. Layanan ViDCon terbuka luas untuk umum, termasuk OPD/instansi pemerintah, akademisi, mahasiswa, peneliti, pelaku usaha, wartawan, dan seluruh lapisan masyarakat.",
  },
  {
    pertanyaan: "Berapa lama konfirmasi jadwal ViDCon diberikan?",
    jawaban:
      "Tim petugas BPS Kabupaten Musi Rawas akan melakukan verifikasi dan mengirimkan konfirmasi link Google Meet/Zoom via Email / WhatsApp maksimal 1x24 jam pada hari kerja.",
  },
];

const TESTIMONI_AWAL = [
  {
    nama: "H. Supriyadi, M.Si",
    peran: "Kepala Bidang Perencanaan",
    instansi: "Bappeda Musi Rawas",
    pesan:
      "Layanan ViDCon PESTA BPS Musi Rawas sangat membantu kami dalam koordinasi penyusunan data indikator makro PDRB dan kemiskinan daerah tanpa perlu datang langsung. Responnya sangat cepat!",
    rating: 5,
  },
  {
    nama: "Rina Kartika",
    peran: "Mahasiswa Tingkat Akhir",
    instansi: "Universitas Musi Rawas",
    pesan:
      "Sangat dimudahkan saat minta konsultasi metodologi survei untuk skripsi saya. Staf BPS memberikan penjelasan yang ramah, jelas, dan 100% gratis (Layanan Nol Rupiah).",
    rating: 5,
  },
  {
    nama: "Budi Santoso, S.ST",
    peran: "Peneliti Ekonomi Daerah",
    instansi: "Lembaga Riset Publik",
    pesan:
      "Portal PESTA versi baru ini tampilannya jauh lebih keren, modern, dan gampang dipakai di HP. Rekomendasi statistik ROMANTIK dan data mikronya mudah diakses.",
    rating: 5,
  },
];

const CATATAN_SUMBER_KOSONG =
  "BELUM DIVERIFIKASI - dibawa dari kode lama. Isi asal testimoni ini " +
  "(surat, wawancara, formulir kepuasan) sebelum ditayangkan.";

async function main() {
  console.log("Mengisi konten landing ke database...\n");

  // --- Pengaturan situs ---
  let barusan = 0;
  for (const [key, def] of Object.entries(DEFINISI_SETTING)) {
    const ada = await db
      .select({ id: siteSettings.id })
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);

    if (ada.length === 0) {
      await db.insert(siteSettings).values({
        key,
        value: def.bawaan,
        grup: def.grup,
      });
      barusan += 1;
    }
  }
  console.log(`  Pengaturan situs : ${barusan} baru, ${Object.keys(DEFINISI_SETTING).length - barusan} sudah ada`);

  // --- FAQ ---
  let faqBaru = 0;
  for (const [i, item] of FAQ_AWAL.entries()) {
    const ada = await db
      .select({ id: faqs.id })
      .from(faqs)
      .where(eq(faqs.pertanyaan, item.pertanyaan))
      .limit(1);

    if (ada.length === 0) {
      await db.insert(faqs).values({
        pertanyaan: item.pertanyaan,
        jawaban: item.jawaban,
        kategori: "ViDCon",
        sortOrder: i,
        isPublished: true,
      });
      faqBaru += 1;
    }
  }
  console.log(`  FAQ              : ${faqBaru} baru, tayang`);

  // --- Testimoni ---
  let tesBaru = 0;
  for (const [i, item] of TESTIMONI_AWAL.entries()) {
    const ada = await db
      .select({ id: testimonials.id })
      .from(testimonials)
      .where(eq(testimonials.nama, item.nama))
      .limit(1);

    if (ada.length === 0) {
      await db.insert(testimonials).values({
        ...item,
        sortOrder: i,
        isPublished: false,
        sourceNote: CATATAN_SUMBER_KOSONG,
      });
      tesBaru += 1;
    }
  }
  console.log(`  Testimoni        : ${tesBaru} baru, TIDAK TAYANG`);

  console.log("\nSelesai.\n");
  console.log("Catatan penting soal testimoni:");
  console.log("  Ketiganya menyebut nama orang dan instansi tertentu, dan");
  console.log("  belum diketahui apakah mereka benar-benar menyatakannya.");
  console.log("  Isi kolom 'catatan sumber' di /admin/konten lebih dulu,");
  console.log("  baru nyalakan saklar tayang.");

  process.exit(0);
}

main().catch((error) => {
  console.error("Seed gagal:", error);
  process.exit(1);
});
