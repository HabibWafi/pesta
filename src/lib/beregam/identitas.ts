import type { WebhookPayload } from "./contracts";

/**
 * Menentukan siapa pengirim sebuah pesan WhatsApp.
 *
 * MASALAH YANG DIPECAHKAN DI SINI
 *
 * WhatsApp kini kerap memakai pengalamatan **LID** (Linked ID). Alih-alih
 * "6285228844884@c.us", engine mengirim "190666499973242@lid". Bentuknya
 * angka dan panjangnya mirip nomor telepon, tapi itu BUKAN nomor - tidak ada
 * yang bisa dihubungi di sana.
 *
 * Sebelum berkas ini ada, kode hanya membuang karakter non-angka dari `from`
 * lalu menyimpannya sebagai `phone`. Akibatnya nomor yang tampil di inbox
 * petugas, di notifikasi WhatsApp, dan yang terisi otomatis lewat pintasan
 * "sama" pada formulir, semuanya angka LID yang tidak berarti apa-apa.
 * Petugas yang menelepon nomor itu tidak akan pernah sampai ke wargarnya.
 *
 * Nomor sungguhannya dititipkan engine di `_data.key.remoteJidAlt`.
 *
 * PRINSIP: lebih baik TIDAK punya nomor daripada punya nomor yang salah.
 * Nomor palsu tampak sah, dan petugas baru sadar setelah menghubunginya
 * gagal - kalau sadar sama sekali. Karena itu, saat nomor asli tidak bisa
 * dipastikan, fungsi ini mengembalikan string kosong, bukan tebakan.
 */

type Payload = NonNullable<WebhookPayload["payload"]>;

/** Mengambil bagian angka sebelum "@" dari sebuah JID. */
function angkaJid(jid?: string | null): string {
  if (!jid) return "";
  return jid.split("@")[0].replace(/[^0-9]/g, "");
}

/** Apakah alamat ini berupa LID, yang berarti bukan nomor telepon? */
export function alamatLid(jid?: string | null): boolean {
  return typeof jid === "string" && jid.includes("@lid");
}

/**
 * Nomor telepon asli pengirim, atau string kosong bila tidak bisa dipastikan.
 *
 * Urutannya disengaja: alamat alternatif dari engine lebih dipercaya daripada
 * `from`, karena justru itulah yang disediakan engine untuk kasus LID.
 */
export function nomorAsli(p: Payload | undefined): string {
  const kunci = p?._data?.key;

  const dariAlt = angkaJid(kunci?.remoteJidAlt) || angkaJid(kunci?.participantAlt);
  if (dariAlt) return dariAlt;

  const from = p?.from ?? "";

  // LID tanpa alamat alternatif: kita memang tidak tahu nomornya. Jangan
  // mengarang - angka LID akan terlihat seperti nomor telepon yang sah.
  if (alamatLid(from) || alamatLid(kunci?.remoteJid)) return "";

  return angkaJid(from);
}

/**
 * Nama profil WhatsApp pengirim.
 *
 * Pada payload LID, pushName hanya ada di dalam `_data` - itu sebabnya
 * seluruh kontak LID sempat tersimpan tanpa nama sama sekali, dan inbox
 * petugas hanya menampilkan deretan angka.
 */
export function namaProfil(p: Payload | undefined): string | null {
  const nama = p?.pushName ?? p?.notifyName ?? p?._data?.pushName ?? null;
  const bersih = typeof nama === "string" ? nama.trim() : "";
  return bersih ? bersih.slice(0, 120) : null;
}
