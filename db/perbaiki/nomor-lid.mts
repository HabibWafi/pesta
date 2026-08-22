/**
 * Memperbaiki kontak yang terlanjur menyimpan angka LID sebagai nomor telepon.
 *
 *   npm run perbaiki:nomor-lid           (lihat dulu, tidak mengubah apa pun)
 *   npm run perbaiki:nomor-lid -- terapkan
 *
 * LATAR
 *
 * WhatsApp kini kerap memakai pengalamatan LID: `from` berupa
 * "190666499973242@lid", bukan nomor telepon. Kode lama membuang karakter
 * non-angka dari sana lalu menyimpannya sebagai `phone` - sehingga yang
 * tampil di inbox petugas adalah angka yang mirip nomor tapi tidak bisa
 * dihubungi siapa pun.
 *
 * Kode sekarang sudah mengambil nomor asli dari payload dan memperbaiki
 * sendiri kontak lama begitu ada pesan baru masuk. Skrip ini untuk yang
 * TIDAK menunggu itu: kontak yang mungkin lama tidak mengirim pesan lagi,
 * padahal petugas perlu menghubunginya sekarang.
 *
 * Nomor aslinya dipulihkan dari payload webhook yang sudah tersimpan di
 * kolom `raw` tabel beregam_messages - tidak menebak sama sekali.
 */

import { and, desc, eq, like } from "drizzle-orm";
import { db } from "../../src/lib/db/index.js";
import { beregamContacts, beregamMessages } from "../../src/lib/beregam/db/schema.js";
import { namaProfil, nomorAsli } from "../../src/lib/beregam/identitas.js";

const terapkan = process.argv.includes("terapkan");

async function main() {
  console.log(
    terapkan
      ? "\nMemperbaiki nomor kontak LID...\n"
      : "\nPratinjau saja - tambahkan `-- terapkan` untuk benar-benar mengubah.\n"
  );

  const kontakLid = await db
    .select()
    .from(beregamContacts)
    .where(like(beregamContacts.waId, "%@lid"));

  if (kontakLid.length === 0) {
    console.log("Tidak ada kontak berpengalamatan LID. Tidak ada yang perlu diperbaiki.\n");
    process.exit(0);
  }

  let diperbaiki = 0;
  let sudahBenar = 0;
  let takDiketahui = 0;

  for (const k of kontakLid) {
    // Payload masuk terakhir dari kontak ini - di sanalah remoteJidAlt berada.
    const [pesan] = await db
      .select({ raw: beregamMessages.raw })
      .from(beregamMessages)
      .where(and(eq(beregamMessages.contactId, k.id), eq(beregamMessages.direction, "in")))
      .orderBy(desc(beregamMessages.id))
      .limit(1);

    const payload = (pesan?.raw as { payload?: unknown } | null)?.payload;
    const nomor = nomorAsli(payload as never);
    // Nama profil juga hilang pada kontak LID: pushName-nya hanya ada di
    // dalam _data, dan kode lama tidak membacanya. Akibatnya inbox petugas
    // cuma menampilkan deretan angka. Sumbernya sama, jadi dipulihkan
    // sekalian di sini.
    const nama = namaProfil(payload as never);
    const lidPolos = k.waId.split("@")[0];

    // Tampilkan tersamar - berkas log tidak boleh memuat nomor lengkap.
    const samar = (n: string) => (n.length > 7 ? `${n.slice(0, 5)}****${n.slice(-3)}` : n || "-");

    const nomorPerluDiubah = Boolean(nomor) && nomor !== k.phone;
    const namaPerluDiubah = Boolean(nama) && !k.name;

    if (!nomor && !nama) {
      console.log(`  ? id=${k.id}  LID ${lidPolos}  -> tidak ada yang bisa dipulihkan dari riwayat`);
      takDiketahui += 1;
      continue;
    }

    if (!nomorPerluDiubah && !namaPerluDiubah) {
      sudahBenar += 1;
      continue;
    }

    const bagian = [
      nomorPerluDiubah
        ? `${samar(k.phone)} -> ${samar(nomor)}${k.phone === lidPolos ? " (sebelumnya angka LID)" : ""}`
        : "",
      namaPerluDiubah ? `nama: (kosong) -> ${nama}` : "",
    ].filter(Boolean);

    console.log(`  ${terapkan ? "diperbaiki" : "akan diperbaiki"}: id=${k.id}  ${bagian.join("  |  ")}`);

    if (terapkan) {
      await db
        .update(beregamContacts)
        .set({
          ...(nomorPerluDiubah ? { phone: nomor } : {}),
          ...(namaPerluDiubah && nama ? { name: nama } : {}),
        })
        .where(eq(beregamContacts.id, k.id));
    }
    diperbaiki += 1;
  }

  console.log(
    `\nRingkasan: ${diperbaiki} ${terapkan ? "diperbaiki" : "perlu diperbaiki"}, ` +
      `${sudahBenar} sudah benar, ${takDiketahui} tidak diketahui.\n`
  );

  if (!terapkan && diperbaiki > 0) {
    console.log("Jalankan ulang dengan `-- terapkan` untuk menerapkannya.\n");
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Gagal:", error);
  process.exit(1);
});
