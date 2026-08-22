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
    // Formulir langsung di chat - lihat src/lib/beregam/forms.ts. Baris
    // kedua dan seterusnya (kalau ada) jadi sapaan pembuka, admin bebas
    // menyuntingnya dari panel tanpa menyentuh kode.
    answer: "[FORM:data]",
  },
  {
    menuKey: "3",
    title: "Konsultasi statistik (ViDCon)",
    answer: "[FORM:vidcon]",
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
    // Formulir langsung di chat. Kanal lain (SP4N-LAPOR!, WBS) tetap
    // disebutkan untuk warga yang ingin melapor lewat jalur eksternal resmi.
    answer:
      "[FORM:pengaduan]\n" +
      "📮 Baik, saya bantu catat aduan/saran Anda di sini. Kanal lain yang " +
      "juga tersedia: SP4N-LAPOR! (https://www.lapor.go.id) dan " +
      "Whistleblowing System BPS " +
      "(https://webapps.bps.go.id/pengaduan/wbs/beranda).",
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
