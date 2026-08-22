/**
 * Mengisi menu FAQ bot dan baris kesehatan sistem.
 *
 *   npm run db:seed:beregam
 *
 * Aman diulang: entri dicocokkan berdasarkan menuKey.
 *
 * Jawaban sengaja diberi penanda [ISI: ...] supaya jelas mana yang masih
 * harus dilengkapi lewat admin panel. Bot yang menjawab dengan teks
 * penanda jauh lebih baik daripada bot yang menjawab dengan informasi
 * karangan - dan penandanya langsung terlihat saat diuji.
 */

import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db/index.js";
import { beregamFaq, beregamHealth } from "../../src/lib/beregam/db/schema.js";

const MENU = [
  {
    menuKey: "1",
    title: "Jam layanan & lokasi kantor",
    answer:
      "⏰ *Jam Layanan Pelayanan Statistik Terpadu (PST)*\n" +
      "Senin - Kamis: 08.00 - 15.30 WIB\n" +
      "Jumat: 08.00 - 16.00 WIB\n" +
      "Sabtu, Minggu, dan hari libur nasional: tutup\n\n" +
      "📍 *Alamat*\n" +
      "Jl. Pangeran Mohammad Amin, Komplek Perkantoran Agropolitan\n" +
      "Muara Beliti, Musi Rawas, Sumatera Selatan\n\n" +
      "☎️ Telepon: (0733) 4540056\n" +
      "📧 Email: bps1605@bps.go.id\n\n" +
      "Ditunggu kedatangannya! 😊",
  },
  {
    menuKey: "2",
    title: "Permintaan data statistik",
    answer:
      "📊 Permintaan data dapat diajukan lewat portal PESTA:\n" +
      "https://bpskabmusirawas.com\n\n" +
      "[ISI: sebutkan jenis data yang tersedia, berkas apa yang perlu " +
      "disiapkan pemohon, dan berapa lama pemrosesannya]\n\n" +
      "Butuh bantuan langsung? Ketik *8* untuk terhubung dengan petugas kami.",
  },
  {
    menuKey: "3",
    title: "Konsultasi statistik (ViDCon)",
    answer:
      "💬 *ViDCon* adalah konsultasi statistik daring bersama petugas BPS, " +
      "*100% gratis*.\n\n" +
      "Daftar di: https://bpskabmusirawas.com\n\n" +
      "Topik yang bisa dikonsultasikan antara lain data perekonomian, " +
      "inflasi, kependudukan, metodologi survei, dan rekomendasi statistik.\n\n" +
      "Konfirmasi jadwal dikirim maksimal 1x24 jam pada hari kerja.\n\n" +
      "Butuh pendampingan khusus (juru bahasa isyarat, pendampingan lansia, " +
      "dan lainnya)? Sebutkan saat mendaftar, petugas kami akan menyiapkannya " +
      "dengan senang hati. 🤝",
  },
  {
    menuKey: "4",
    title: "Publikasi & rilis terbaru",
    answer:
      "📚 Seluruh publikasi dan Berita Resmi Statistik BPS Kabupaten Musi Rawas " +
      "dapat diunduh gratis di:\n" +
      "https://musirawaskab.bps.go.id\n\n" +
      "[ISI: sebutkan publikasi unggulan dan jadwal rilis rutin]",
  },
  {
    menuKey: "5",
    title: "Tabel & indikator statistik",
    answer:
      "📈 *Tabel & Indikator Statistik*\n\n" +
      "Ringkasan indikator utama Kabupaten Musi Rawas (jumlah penduduk, " +
      "inflasi, PDRB, kemiskinan, dan lainnya) tersedia lewat:\n\n" +
      "[ISI: sebutkan tautan tabel/dashboard indikator resmi, mis. " +
      "https://musirawaskab.bps.go.id/id/statistics-table atau portal Satu Data]\n\n" +
      "Untuk data yang lebih rinci atau belum tersedia di publikasi, silakan " +
      "ajukan lewat menu *2* (Permintaan Data), atau ketik *8* untuk bicara " +
      "langsung dengan petugas kami.",
  },
  {
    menuKey: "6",
    title: "Akses Web PeSTa",
    answer:
      "🌐 *PeSTa - Pelayanan Statistik Digital BPS Musi Rawas*\n\n" +
      "PeSTa adalah portal layanan digital resmi kami: ajukan ViDCon, " +
      "permintaan data, dan pengaduan publik - semua tanpa biaya (Nol Rupiah) " +
      "dan bisa diakses 24 jam.\n\n" +
      "🔗 https://bpskabmusirawas.com\n\n" +
      "Belum pernah coba? Tampilannya mudah dan ramah untuk semua kalangan, " +
      "termasuk penyandang disabilitas. 😊",
  },
  {
    menuKey: "7",
    title: "Pengaduan & saran",
    answer:
      "📮 Sampaikan aduan atau saran Anda lewat:\n\n" +
      "1. Form Aduan di https://bpskabmusirawas.com\n" +
      "2. SP4N-LAPOR! di https://www.lapor.go.id\n" +
      "3. Whistleblowing System BPS di https://webapps.bps.go.id/pengaduan/wbs/beranda\n\n" +
      "Setiap aduan ditindaklanjuti oleh Staf Pengawas BPS Kabupaten Musi Rawas. " +
      "Masukan Anda sangat berarti bagi kami. 🙏",
  },
  {
    menuKey: "8",
    title: "Bicara dengan petugas",
    // Penanda khusus: BeregamService mengeskalasi, bukan mengirim teks ini.
    answer: "[ESKALASI]",
  },
];

async function main() {
  console.log("Mengisi menu bot Beregam...\n");

  let baru = 0;
  let ada = 0;

  for (const [i, m] of MENU.entries()) {
    const [cek] = await db
      .select({ id: beregamFaq.id })
      .from(beregamFaq)
      .where(eq(beregamFaq.menuKey, m.menuKey))
      .limit(1);

    if (cek) {
      ada += 1;
      continue;
    }

    await db.insert(beregamFaq).values({
      menuKey: m.menuKey,
      title: m.title,
      answer: m.answer,
      sortOrder: i,
      isActive: true,
    });
    baru += 1;
  }

  console.log(`  Menu FAQ         : ${baru} baru, ${ada} sudah ada`);

  // Baris kesehatan sistem, selalu id = 1.
  const [health] = await db
    .select({ id: beregamHealth.id })
    .from(beregamHealth)
    .where(eq(beregamHealth.id, 1))
    .limit(1);

  if (!health) {
    await db.insert(beregamHealth).values({ id: 1, botEnabled: true });
    console.log("  Baris kesehatan  : dibuat");
  } else {
    console.log("  Baris kesehatan  : sudah ada");
  }

  console.log("");
  console.log("Selesai.\n");
  console.log("Langkah berikutnya:");
  console.log("  Lengkapi jawaban bertanda [ISI: ...] lewat admin panel.");
  console.log("  Bot yang menjawab dengan penanda lebih baik daripada bot");
  console.log("  yang menjawab dengan informasi karangan.");

  process.exit(0);
}

main().catch((error) => {
  console.error("Seed gagal:", error);
  process.exit(1);
});
