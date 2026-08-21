import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getConfig } from "./config";
import {
  CONTRACTS_VERSION,
  HEADER_API_KEY,
  HEADER_CONTRACTS_VERSION,
  HEADER_WEBHOOK_HMAC,
} from "./contracts";

/**
 * Pemeriksaan keaslian permintaan worker dan webhook.
 *
 * ATURAN MUTLAK: perbandingan nilai rahasia SELALU memakai
 * `crypto.timingSafeEqual`, tidak pernah `===`.
 *
 * Alasannya: `===` pada string berhenti di karakter pertama yang berbeda.
 * Selisih waktunya sangat kecil, tapi cukup diukur lewat ribuan percobaan
 * untuk menebak kunci satu karakter demi satu karakter. `timingSafeEqual`
 * selalu memakan waktu yang sama berapa pun isinya.
 */

/**
 * Membandingkan dua nilai rahasia tanpa membocorkan informasi lewat waktu.
 *
 * Panjang yang berbeda ditangani dengan tetap menjalankan perbandingan
 * berdurasi tetap, bukan dengan langsung mengembalikan false - kalau
 * langsung keluar, panjang kunci pun bisa ditebak dari waktu respons.
 */
export function samaAman(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    // Tetap lakukan pekerjaan sebanding agar durasinya tidak menjadi petunjuk.
    const isian = Buffer.alloc(bufA.length, 0);
    timingSafeEqual(bufA, isian);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

export type HasilOtorisasi =
  | { ok: true; workerId: string }
  | { ok: false; respons: NextResponse };

function tolak(status: number, message: string, tambahan?: Record<string, string>) {
  return NextResponse.json({ ok: false, message, ...tambahan }, { status });
}

/**
 * Memeriksa kunci API dan versi kontrak pada permintaan worker.
 *
 * Dipanggil di baris pertama setiap route Beregam kecuali /health dan
 * /webhook (webhook memakai HMAC, bukan kunci API).
 */
export function otorisasiWorker(req: Request): HasilOtorisasi {
  let config;
  try {
    config = getConfig();
  } catch (error) {
    console.error("Beregam belum dikonfigurasi:", error);
    return {
      ok: false,
      respons: tolak(503, "Modul Beregam belum dikonfigurasi di server ini."),
    };
  }

  const kunci = req.headers.get(HEADER_API_KEY);
  if (!kunci || !samaAman(kunci, config.apiKey)) {
    return { ok: false, respons: tolak(401, "Kunci API tidak sah.") };
  }

  // Jabat tangan versi. Menangkap worker lama yang masih berjalan di PC
  // sementara PESTA sudah ter-deploy versi baru - kegagalan yang tanpa ini
  // tampak seperti "bot tiba-tiba tidak membalas".
  const versi = req.headers.get(HEADER_CONTRACTS_VERSION);
  if (versi && versi !== CONTRACTS_VERSION) {
    return {
      ok: false,
      respons: tolak(
        409,
        `Versi kontrak API tidak cocok. Worker mengirim ${versi}, server memakai ${CONTRACTS_VERSION}. ` +
          "Jalankan `npm run contracts:sync` di repositori beregam lalu nyalakan ulang worker.",
        { contractsVersion: versi, expectedVersion: CONTRACTS_VERSION }
      ),
    };
  }

  const workerId = req.headers.get("x-worker-id") ?? "tidak-dikenal";
  return { ok: true, workerId: workerId.slice(0, 64) };
}

/**
 * Memverifikasi tanda tangan HMAC webhook.
 *
 * WAJIB dihitung atas RAW BODY. Panggil `await req.text()` lebih dulu, baru
 * `JSON.parse` - memakai `req.json()` duluan akan mengubah byte-nya
 * (urutan kunci, spasi, presisi angka) sehingga tanda tangannya tidak akan
 * pernah cocok, dan penyebabnya sangat sulit ditelusuri.
 */
export function webhookSah(rawBody: string, tandaTangan: string | null): boolean {
  if (!tandaTangan) return false;

  const config = getConfig();
  const dihitung = createHmac("sha512", config.webhookHmac).update(rawBody, "utf8").digest("hex");

  // Sebagian engine mengawali tanda tangan dengan "sha512=".
  const bersih = tandaTangan.replace(/^sha512=/i, "").trim();

  return samaAman(dihitung, bersih);
}

/** Nama header HMAC, diekspor agar route tidak menuliskannya ulang. */
export { HEADER_WEBHOOK_HMAC };
