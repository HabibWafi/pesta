/**
 * Memeriksa sambungan ke Web API resmi BPS.
 *
 *   npm run cek:bps
 *
 * Jalankan DI SERVER tempat PESTA berjalan, bukan hanya di komputer sendiri.
 * Web API BPS berada di balik penyaring bot, dan penyaring itu bisa
 * memperlakukan setiap jaringan berbeda - lolos dari satu tempat tidak
 * menjamin lolos dari tempat lain. Itulah yang ingin dipastikan skrip ini.
 *
 * Aman dijalankan kapan saja: hanya membaca, tidak mengubah apa pun.
 */

import {
  adaKunciBps,
  ambilPublikasiLangsung,
  ambilTabelLangsung,
  TAUTAN_PUBLIKASI,
  TAUTAN_TABEL,
} from "../src/lib/beregam/bps-api.js";

async function main() {
  console.log("\nMemeriksa sambungan ke Web API resmi BPS\n");

  if (!adaKunciBps()) {
    console.log("  BPS_WEBAPI_KEY belum diisi.\n");
    console.log("  Menu 4 dan 5 TETAP BERFUNGSI - warga menerima tautan resmi");
    console.log("  berikut penjelasannya, bukan pesan galat. Yang belum aktif");
    console.log("  hanya daftar publikasi dan tabel yang tampil langsung di chat.\n");
    console.log("  Untuk mengaktifkannya:");
    console.log("    1. Daftar gratis di https://webapi.bps.go.id/developer");
    console.log("    2. Isi BPS_WEBAPI_KEY di environment (hPanel > Node.js)");
    console.log("    3. Jalankan ulang perintah ini\n");
    process.exit(0);
  }

  let gagal = 0;

  const publikasi = await ambilPublikasiLangsung();
  if (publikasi && publikasi.length > 0) {
    console.log(`  LULUS  Publikasi terbaca (${publikasi.length} entri)`);
    for (const p of publikasi.slice(0, 3)) {
      console.log(`           - ${p.judul.slice(0, 70)}${p.tanggal ? `  [${p.tanggal}]` : ""}`);
    }
  } else {
    console.log("  GAGAL  Publikasi tidak terbaca");
    gagal += 1;
  }

  const tabel = await ambilTabelLangsung();
  if (tabel && tabel.length > 0) {
    console.log(`\n  LULUS  Tabel statistik terbaca (${tabel.length} entri)`);
    for (const t of tabel.slice(0, 3)) {
      console.log(`           - ${t.judul.slice(0, 70)}${t.diperbarui ? `  [${t.diperbarui}]` : ""}`);
    }
  } else {
    console.log("\n  GAGAL  Tabel statistik tidak terbaca");
    gagal += 1;
  }

  if (gagal > 0) {
    console.log("\n  Penyebab yang paling sering, urut dari yang paling mungkin:");
    console.log("    - Kunci salah ketik atau sudah tidak berlaku");
    console.log("    - Permintaan diblokir penyaring bot dari jaringan server ini");
    console.log("    - Web API BPS sedang gangguan");
    console.log("\n  Sementara itu warga TIDAK melihat galat apa pun - menu 4 dan 5");
    console.log("  otomatis memakai tautan resmi:");
    console.log(`    ${TAUTAN_PUBLIKASI}`);
    console.log(`    ${TAUTAN_TABEL}\n`);
    process.exit(1);
  }

  console.log("\n  Sambungan ke Web API BPS berfungsi. Menu 4 dan 5 akan menampilkan");
  console.log("  daftar terbaru langsung di percakapan WhatsApp.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("Gagal:", error);
  process.exit(1);
});
