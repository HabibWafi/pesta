/**
 * Mengubah nomor HP yang diketik warga menjadi bentuk yang dipakai WhatsApp.
 *
 * KENAPA HARUS HATI-HATI
 *
 * Nomor ini dipakai untuk MENGIRIM pesan. Salah menormalkan berarti undangan
 * ViDCon berisi nama, jadwal, dan tautan rapat terkirim ke orang yang sama
 * sekali tidak berkepentingan - dan warga yang seharusnya menerima justru
 * menunggu undangan yang tidak pernah datang.
 *
 * Karena itu bentuk yang meragukan DITOLAK, bukan ditebak. Lebih baik
 * petugas diberi tahu "nomor ini tidak bisa dipakai" lalu menghubungi warga
 * lewat email, daripada sistem mengarang nomor yang kebetulan valid.
 */

export type HasilNomor =
  | { ok: true; wa: string }
  | { ok: false; alasan: string };

/**
 * Bentuk yang diterima (Indonesia):
 *   0813-7302-8055   -> 6281373028055
 *   +62 813 7302 8055 -> 6281373028055
 *   62813 7302 8055  -> 6281373028055
 *   813 7302 8055    -> 6281373028055  (tanpa awalan, diasumsikan Indonesia)
 */
export function keNomorWa(mentah: string | null | undefined): HasilNomor {
  const angka = (mentah ?? "").replace(/[^0-9]/g, "");
  if (!angka) return { ok: false, alasan: "nomor kosong" };

  let inti: string;
  if (angka.startsWith("62")) {
    inti = angka.slice(2);
  } else if (angka.startsWith("0")) {
    inti = angka.replace(/^0+/, "");
  } else if (angka.startsWith("8")) {
    // Sebagian warga menulis tanpa 0 maupun 62.
    inti = angka;
  } else {
    return {
      ok: false,
      alasan: "bukan nomor Indonesia yang dikenali (harus diawali 08, 62, atau 8)",
    };
  }

  if (!inti.startsWith("8")) {
    return { ok: false, alasan: "bukan nomor seluler (setelah kode negara harus diawali 8)" };
  }

  // Nomor seluler Indonesia: 9-13 digit setelah kode negara.
  if (inti.length < 9 || inti.length > 13) {
    return { ok: false, alasan: `panjang nomor tidak wajar (${inti.length} digit setelah 62)` };
  }

  return { ok: true, wa: `62${inti}` };
}
