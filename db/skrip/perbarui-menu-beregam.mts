/**
 * Migrasi data SEKALI JALAN: menyisipkan menu "Tabel Statistik" dan
 * "Akses Web PeSTa" setelah menu 4, menggeser Pengaduan & Bicara Petugas
 * ke 7 dan 8, sekaligus memperbarui isi enam menu lama ke naskah yang
 * lebih hidup.
 *
 *   node --env-file=.env --import tsx db/skrip/perbarui-menu-beregam.mts
 *
 * BERBEDA DARI db/seed/beregam.mts - itu skrip yang aman diulang selamanya
 * (hanya mengisi yang kosong, tidak pernah menimpa). Skrip ini SEKALI PAKAI:
 * tugasnya menggeser data lama ke posisi baru, dan pergeseran seperti itu
 * tidak boleh terjadi dua kali. Aman dijalankan berulang HANYA karena setiap
 * langkah memeriksa dulu keadaan sebelum mengubah - bukan karena dirancang
 * untuk diulang.
 *
 * Untuk Hostinger: jalankan skrip ini SEKALI dari komputer pengembangan
 * dengan DATABASE_URL diarahkan ke database produksi (perlu Remote MySQL
 * diaktifkan di hPanel), ATAU pakai admin panel /admin/beregam untuk
 * menyusun ulang menunya secara manual - hasil akhirnya sama.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../src/lib/db/index.js";
import { beregamFaq } from "../../src/lib/beregam/db/schema.js";

async function geserJikaBelum(
  dariKey: string,
  judulLama: string,
  keKey: string,
  sortOrderBaru: number
): Promise<string> {
  const [baris] = await db
    .select({ id: beregamFaq.id })
    .from(beregamFaq)
    .where(and(eq(beregamFaq.menuKey, dariKey), eq(beregamFaq.title, judulLama)))
    .limit(1);

  if (!baris) return `  ${dariKey} -> ${keKey}  (dilewati, sudah tergeser atau tidak cocok)`;

  await db
    .update(beregamFaq)
    .set({ menuKey: keKey, sortOrder: sortOrderBaru })
    .where(eq(beregamFaq.id, baris.id));

  return `  ${dariKey} -> ${keKey}  digeser`;
}

async function sisipkanJikaBelum(
  menuKey: string,
  title: string,
  answer: string,
  sortOrder: number
): Promise<string> {
  const [ada] = await db
    .select({ id: beregamFaq.id })
    .from(beregamFaq)
    .where(eq(beregamFaq.menuKey, menuKey))
    .limit(1);

  if (ada) return `  menu ${menuKey} (${title})  dilewati, sudah ada`;

  await db.insert(beregamFaq).values({ menuKey, title, answer, sortOrder, isActive: true });
  return `  menu ${menuKey} (${title})  disisipkan`;
}

async function perbaruiJikaMasihLama(
  menuKey: string,
  answerLama: string,
  answerBaru: string
): Promise<string> {
  const [result] = await db
    .update(beregamFaq)
    .set({ answer: answerBaru })
    .where(and(eq(beregamFaq.menuKey, menuKey), eq(beregamFaq.answer, answerLama)));

  return result.affectedRows > 0
    ? `  menu ${menuKey}  naskah diperbarui`
    : `  menu ${menuKey}  dilewati (naskah sudah beda dari bawaan - mungkin sudah diedit admin)`;
}

async function main() {
  console.log("1. Menggeser menu lama ke posisi baru\n");
  console.log(await geserJikaBelum("5", "Pengaduan & saran", "7", 6));
  console.log(await geserJikaBelum("6", "Bicara dengan petugas", "8", 7));

  console.log("\n2. Menyisipkan dua menu baru\n");
  console.log(
    await sisipkanJikaBelum(
      "5",
      "Tabel & indikator statistik",
      "📈 *Tabel & Indikator Statistik*\n\n" +
        "Ringkasan indikator utama Kabupaten Musi Rawas (jumlah penduduk, " +
        "inflasi, PDRB, kemiskinan, dan lainnya) tersedia lewat:\n\n" +
        "[ISI: sebutkan tautan tabel/dashboard indikator resmi, mis. " +
        "https://musirawaskab.bps.go.id/id/statistics-table atau portal Satu Data]\n\n" +
        "Untuk data yang lebih rinci atau belum tersedia di publikasi, silakan " +
        "ajukan lewat menu *2* (Permintaan Data), atau ketik *8* untuk bicara " +
        "langsung dengan petugas kami.",
      4
    )
  );
  console.log(
    await sisipkanJikaBelum(
      "6",
      "Akses Web PeSTa",
      "🌐 *PeSTa - Pelayanan Statistik Digital BPS Musi Rawas*\n\n" +
        "PeSTa adalah portal layanan digital resmi kami: ajukan ViDCon, " +
        "permintaan data, dan pengaduan publik - semua tanpa biaya (Nol Rupiah) " +
        "dan bisa diakses 24 jam.\n\n" +
        "🔗 https://bpskabmusirawas.com\n\n" +
        "Belum pernah coba? Tampilannya mudah dan ramah untuk semua kalangan, " +
        "termasuk penyandang disabilitas. 😊",
      5
    )
  );

  console.log("\n3. Memperbarui naskah menu lama menjadi lebih hidup\n");
  console.log(
    await perbaruiJikaMasihLama(
      "1",
      "*Jam Layanan Pelayanan Statistik Terpadu (PST)*\n" +
        "Senin - Kamis: 08.00 - 15.30 WIB\n" +
        "Jumat: 08.00 - 16.00 WIB\n" +
        "Sabtu, Minggu, dan hari libur nasional: tutup\n\n" +
        "*Alamat*\n" +
        "Jl. Pangeran Mohammad Amin, Komplek Perkantoran Agropolitan\n" +
        "Muara Beliti, Musi Rawas, Sumatera Selatan\n\n" +
        "Telepon: (0733) 7432008\n" +
        "Email: bps1605@bps.go.id",
      "⏰ *Jam Layanan Pelayanan Statistik Terpadu (PST)*\n" +
        "Senin - Kamis: 08.00 - 15.30 WIB\n" +
        "Jumat: 08.00 - 16.00 WIB\n" +
        "Sabtu, Minggu, dan hari libur nasional: tutup\n\n" +
        "📍 *Alamat*\n" +
        "Jl. Pangeran Mohammad Amin, Komplek Perkantoran Agropolitan\n" +
        "Muara Beliti, Musi Rawas, Sumatera Selatan\n\n" +
        "☎️ Telepon: (0733) 7432008\n" +
        "📧 Email: bps1605@bps.go.id\n\n" +
        "Ditunggu kedatangannya! 😊"
    )
  );
  console.log(
    await perbaruiJikaMasihLama(
      "2",
      "Permintaan data dapat diajukan lewat portal PESTA:\n" +
        "https://bpskabmusirawas.com\n\n" +
        "[ISI: sebutkan jenis data yang tersedia, berkas apa yang perlu " +
        "disiapkan pemohon, dan berapa lama pemrosesannya]\n\n" +
        "Ketik *6* bila ingin dibantu langsung oleh petugas.",
      "📊 Permintaan data dapat diajukan lewat portal PESTA:\n" +
        "https://bpskabmusirawas.com\n\n" +
        "[ISI: sebutkan jenis data yang tersedia, berkas apa yang perlu " +
        "disiapkan pemohon, dan berapa lama pemrosesannya]\n\n" +
        "Butuh bantuan langsung? Ketik *8* untuk terhubung dengan petugas kami."
    )
  );
  console.log(
    await perbaruiJikaMasihLama(
      "3",
      "*ViDCon* adalah konsultasi statistik daring bersama petugas BPS, " +
        "*100% gratis*.\n\n" +
        "Daftar di: https://bpskabmusirawas.com\n\n" +
        "Topik yang bisa dikonsultasikan antara lain data perekonomian, " +
        "inflasi, kependudukan, metodologi survei, dan rekomendasi statistik.\n\n" +
        "Konfirmasi jadwal dikirim maksimal 1x24 jam pada hari kerja.\n\n" +
        "Butuh pendampingan khusus (juru bahasa isyarat, pendampingan lansia, " +
        "dan lainnya)? Sebutkan saat mendaftar - petugas akan menyiapkannya.",
      "💬 *ViDCon* adalah konsultasi statistik daring bersama petugas BPS, " +
        "*100% gratis*.\n\n" +
        "Daftar di: https://bpskabmusirawas.com\n\n" +
        "Topik yang bisa dikonsultasikan antara lain data perekonomian, " +
        "inflasi, kependudukan, metodologi survei, dan rekomendasi statistik.\n\n" +
        "Konfirmasi jadwal dikirim maksimal 1x24 jam pada hari kerja.\n\n" +
        "Butuh pendampingan khusus (juru bahasa isyarat, pendampingan lansia, " +
        "dan lainnya)? Sebutkan saat mendaftar, petugas kami akan menyiapkannya " +
        "dengan senang hati. 🤝"
    )
  );
  console.log(
    await perbaruiJikaMasihLama(
      "4",
      "Seluruh publikasi dan Berita Resmi Statistik BPS Kabupaten Musi Rawas " +
        "dapat diunduh gratis di:\n" +
        "https://musirawaskab.bps.go.id\n\n" +
        "[ISI: sebutkan publikasi unggulan dan jadwal rilis rutin]",
      "📚 Seluruh publikasi dan Berita Resmi Statistik BPS Kabupaten Musi Rawas " +
        "dapat diunduh gratis di:\n" +
        "https://musirawaskab.bps.go.id\n\n" +
        "[ISI: sebutkan publikasi unggulan dan jadwal rilis rutin]"
    )
  );
  console.log(
    await perbaruiJikaMasihLama(
      "7",
      "Sampaikan aduan atau saran Anda lewat:\n\n" +
        "1. Form Aduan di https://bpskabmusirawas.com\n" +
        "2. SP4N-LAPOR! di https://www.lapor.go.id\n" +
        "3. Whistleblowing System BPS di https://webapps.bps.go.id/pengaduan/wbs/beranda\n\n" +
        "Setiap aduan ditindaklanjuti oleh Staf Pengawas BPS Kabupaten Musi Rawas.",
      "📮 Sampaikan aduan atau saran Anda lewat:\n\n" +
        "1. Form Aduan di https://bpskabmusirawas.com\n" +
        "2. SP4N-LAPOR! di https://www.lapor.go.id\n" +
        "3. Whistleblowing System BPS di https://webapps.bps.go.id/pengaduan/wbs/beranda\n\n" +
        "Setiap aduan ditindaklanjuti oleh Staf Pengawas BPS Kabupaten Musi Rawas. " +
        "Masukan Anda sangat berarti bagi kami. 🙏"
    )
  );

  console.log("\nSelesai.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("Migrasi gagal:", error);
  process.exit(1);
});
