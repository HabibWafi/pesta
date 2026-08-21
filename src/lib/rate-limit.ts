/**
 * Pembatas percobaan login.
 *
 * Tanpa ini, siapa pun bisa mencoba ribuan kombinasi sandi ke
 * /api/auth/login tanpa hambatan apa pun. bcrypt memang lambat, tapi
 * lambat saja bukan pembatas - ia hanya memperlambat, tidak menghentikan.
 *
 * Disimpan di memori proses, bukan di database. Alasannya: aplikasi Node
 * di Hostinger berjalan sebagai satu proses persisten, jadi memori sudah
 * cukup, dan menulis ke MySQL pada setiap percobaan justru memberi
 * penyerang cara mudah membebani database.
 *
 * Konsekuensi yang harus disadari: hitungan ini hilang saat aplikasi
 * restart. Untuk melindungi dari serangan tebak sandi yang berlangsung
 * menit demi menit, itu sudah memadai.
 */

interface Catatan {
  gagal: number;
  /** Kapan blokir berakhir (epoch ms). 0 berarti tidak diblokir. */
  blokirSampai: number;
  terakhir: number;
}

const MAKS_GAGAL = 5;
const JENDELA_MS = 15 * 60_000; // percobaan direset setelah 15 menit tenang
const BLOKIR_MS = 15 * 60_000;

const penyimpanan = globalThis as unknown as {
  pestaLoginLimit?: Map<string, Catatan>;
};

function peta(): Map<string, Catatan> {
  penyimpanan.pestaLoginLimit ??= new Map();
  return penyimpanan.pestaLoginLimit;
}

/** Membuang catatan yang sudah lama tidak tersentuh, agar memori tidak menumpuk. */
function sapuBersih(sekarang: number): void {
  const m = peta();
  if (m.size < 500) return;
  for (const [kunci, c] of m) {
    if (sekarang - c.terakhir > JENDELA_MS && c.blokirSampai < sekarang) {
      m.delete(kunci);
    }
  }
}

export interface HasilPemeriksaan {
  boleh: boolean;
  /** Sisa detik sampai bisa mencoba lagi. */
  tungguDetik: number;
  sisaPercobaan: number;
}

/**
 * Kunci pembatas.
 *
 * Digabung dari IP dan email supaya satu kantor yang berbagi IP tidak
 * saling mengunci saat dua orang sama-sama salah ketik sandi.
 * Email dinormalkan agar "Budi@x" dan "budi@x" dihitung sama.
 */
export function kunciLimit(ip: string, email: string): string {
  return `${ip}|${email.trim().toLowerCase()}`;
}

export function periksaLimit(kunci: string): HasilPemeriksaan {
  const sekarang = Date.now();
  sapuBersih(sekarang);

  const c = peta().get(kunci);
  if (!c) return { boleh: true, tungguDetik: 0, sisaPercobaan: MAKS_GAGAL };

  if (c.blokirSampai > sekarang) {
    return {
      boleh: false,
      tungguDetik: Math.ceil((c.blokirSampai - sekarang) / 1000),
      sisaPercobaan: 0,
    };
  }

  // Sudah lewat jendela tenang - anggap bersih kembali.
  if (sekarang - c.terakhir > JENDELA_MS) {
    peta().delete(kunci);
    return { boleh: true, tungguDetik: 0, sisaPercobaan: MAKS_GAGAL };
  }

  return { boleh: true, tungguDetik: 0, sisaPercobaan: Math.max(0, MAKS_GAGAL - c.gagal) };
}

/** Dicatat setiap kali login gagal. */
export function catatGagal(kunci: string): HasilPemeriksaan {
  const sekarang = Date.now();
  const m = peta();
  const c = m.get(kunci) ?? { gagal: 0, blokirSampai: 0, terakhir: sekarang };

  if (sekarang - c.terakhir > JENDELA_MS) c.gagal = 0;

  c.gagal += 1;
  c.terakhir = sekarang;
  if (c.gagal >= MAKS_GAGAL) c.blokirSampai = sekarang + BLOKIR_MS;

  m.set(kunci, c);

  return {
    boleh: c.blokirSampai <= sekarang,
    tungguDetik: c.blokirSampai > sekarang ? Math.ceil(BLOKIR_MS / 1000) : 0,
    sisaPercobaan: Math.max(0, MAKS_GAGAL - c.gagal),
  };
}

/** Dipanggil setelah login berhasil, agar hitungannya bersih kembali. */
export function resetLimit(kunci: string): void {
  peta().delete(kunci);
}
