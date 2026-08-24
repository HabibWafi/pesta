import * as z from "zod";

/**
 * Konfigurasi modul Beregam.
 *
 * Dibaca dari environment dan divalidasi Zod. Nilai rahasia TIDAK punya
 * nilai cadangan di dalam kode - nilai cadangan berarti siapa pun yang bisa
 * membaca repositori dapat memalsukan permintaan worker. Gagal dengan pesan
 * jelas lebih baik daripada jalan dengan kunci yang diketahui publik.
 */

const angka = (bawaan: number) =>
  z.coerce.number().int().positive().default(bawaan);

const configSchema = z.object({
  /** Driver pengiriman. Saat ini hanya "openwa"; "cloud-api" masih stub. */
  driver: z.enum(["openwa", "cloud-api"]).default("openwa"),

  /** Kunci yang harus dibawa worker di header X-Beregam-Key. */
  apiKey: z.string().min(32, "BEREGAM_API_KEY minimal 32 karakter"),

  /** Kunci HMAC webhook. Harus sama persis dengan yang diisi di engine. */
  webhookHmac: z.string().min(32, "BEREGAM_WEBHOOK_HMAC minimal 32 karakter"),

  /** Sesi percakapan dianggap habis setelah sekian menit menganggur. */
  sessionTtlMinutes: angka(30),

  /** Mode manual dikembalikan otomatis ke bot setelah sekian menit. */
  manualModeTimeoutMinutes: angka(120),

  /**
   * Sesi yang dibiarkan menganggur di menu (bukan sedang mengisi formulir
   * atau menunggu petugas) selama sekian menit dianggap sudah selesai
   * memakai bot, lalu ditanya penilaian secara otomatis. Lihat
   * runMaintenance() di services/maintenance.ts.
   */
  penilaianIdleMinutes: angka(3),

  /**
   * Pagar pesan basi.
   *
   * Saat PC pulih dari mati, WhatsApp mengirimkan seluruh pesan tertahan
   * sekaligus. Tanpa pagar ini, bot memproses semuanya dan warga menerima
   * balasan atas pertanyaan yang sudah diselesaikan admin berjam-jam lalu.
   * Ini pagar terpenting dari seluruh mekanisme pemulihan.
   */
  staleThresholdMinutes: angka(15),

  /**
   * Pembatas laju - MILIK KITA SENDIRI, bukan aturan WAHA atau WhatsApp.
   *
   * WAHA tidak memaksakan batas apa pun; angka di sini murni keputusan
   * proyek ini, dan bisa diubah lewat BEREGAM_RATE_PER_MENIT tanpa deploy
   * ulang kode.
   *
   * Yang sebenarnya dijaga `perMinute` bukan risiko blokir WhatsApp -
   * membalas orang yang memang sedang mengajak bicara adalah perilaku wajar,
   * dan risiko blokir jauh lebih ditentukan `dailyCap` beserta pola kirim
   * massal. Yang dijaga adalah BOT YANG MENGAMUK: satu bug yang membuat bot
   * membalas pesannya sendiri bisa mengirim ratusan pesan ke satu nomor
   * dalam hitungan detik. Pagar per menit inilah yang menahannya.
   *
   * Bawaannya dinaikkan dari 3 ke 10. Angka 3 dulu dipilih saat bot hanya
   * menjawab menu, dan ternyata terlalu ketat begitu ada alur yang butuh
   * beberapa balasan berturut-turut - warga yang mengetik cepat menabraknya
   * lalu bot mendadak diam, yang dari sisi warga terlihat seperti layanan
   * rusak. 10 masih menahan bot mengamuk (yang akan mengirim ratusan, bukan
   * belasan) tanpa pernah mengganggu pemakaian yang wajar.
   */
  rateLimit: z.object({
    /** Maksimal balasan per nomor per menit. */
    perMinute: angka(10),
    /** Batas harian seluruh pesan keluar. Ini pagar utama terhadap risiko blokir. */
    dailyCap: angka(500),
  }),

  /** Jeda acak sebelum mengirim, dalam detik. Bagian dari aturan anti-blokir. */
  jeda: z.object({
    minDetik: angka(3),
    maxDetik: angka(8),
  }),

  semantic: z.object({
    /** Skor minimal untuk langsung menjawab dari basis pengetahuan. */
    thresholdAuto: z.coerce.number().min(0).max(1).default(0.72),
    /** Skor minimal untuk menawarkan kandidat jawaban. */
    thresholdSuggest: z.coerce.number().min(0).max(1).default(0.55),
  }),

  jamLayanan: z.object({
    /** 1 = Senin ... 5 = Jumat. Sabtu dan Minggu tidak termasuk. */
    hariKerja: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
    jamBuka: angka(8),
    jamTutup: angka(16),
  }),

  ai: z.object({
    enabled: z.coerce.boolean().default(false),
    timeoutSeconds: angka(20),
  }),

  /** Sewa kepemilikan worker, dalam detik. Lihat beregam_health. */
  leaseSeconds: angka(120),

  /**
   * Nomor WA petugas yang menerima notifikasi saat ada warga minta
   * bicara dengan petugas. Angka saja, mis. "6285707473757".
   *
   * Opsional dengan sengaja: modul tetap berjalan tanpa nomor ini,
   * hanya notifikasinya yang dilewati (dicatat di log server).
   */
  staffWaNumber: z
    .string()
    .optional()
    .transform((v) => {
      const bersih = v?.replace(/[^0-9]/g, "") ?? "";
      return bersih.length >= 10 ? bersih : undefined;
    }),
});

export type BeregamConfig = z.infer<typeof configSchema>;

let tersimpan: BeregamConfig | null = null;

/**
 * Membaca konfigurasi.
 *
 * Sengaja malas (lazy), bukan dievaluasi saat modul dimuat. `next build`
 * ikut memuat setiap modul, dan variabel rahasia belum tentu tersedia saat
 * build - kalau dievaluasi di tingkat modul, build akan gagal padahal
 * konfigurasinya baik-baik saja di server.
 */
export function getConfig(): BeregamConfig {
  if (tersimpan) return tersimpan;

  const hasil = configSchema.safeParse({
    driver: process.env.BEREGAM_DRIVER,
    apiKey: process.env.BEREGAM_API_KEY,
    webhookHmac: process.env.BEREGAM_WEBHOOK_HMAC,
    sessionTtlMinutes: process.env.BEREGAM_SESSION_TTL_MENIT,
    manualModeTimeoutMinutes: process.env.BEREGAM_MANUAL_TIMEOUT_MENIT,
    penilaianIdleMinutes: process.env.BEREGAM_PENILAIAN_IDLE_MENIT,
    staleThresholdMinutes: process.env.BEREGAM_STALE_MENIT,
    rateLimit: {
      perMinute: process.env.BEREGAM_RATE_PER_MENIT,
      dailyCap: process.env.BEREGAM_BATAS_HARIAN,
    },
    jeda: {
      minDetik: process.env.BEREGAM_JEDA_MIN_DETIK,
      maxDetik: process.env.BEREGAM_JEDA_MAX_DETIK,
    },
    semantic: {
      thresholdAuto: process.env.BEREGAM_AMBANG_OTOMATIS,
      thresholdSuggest: process.env.BEREGAM_AMBANG_SARAN,
    },
    jamLayanan: {
      jamBuka: process.env.BEREGAM_JAM_BUKA,
      jamTutup: process.env.BEREGAM_JAM_TUTUP,
    },
    ai: {
      enabled: process.env.BEREGAM_AI_AKTIF,
      timeoutSeconds: process.env.BEREGAM_AI_TIMEOUT_DETIK,
    },
    leaseSeconds: process.env.BEREGAM_LEASE_DETIK,
    staffWaNumber: process.env.BEREGAM_STAFF_WA,
  });

  if (!hasil.success) {
    const rincian = hasil.error.issues
      .map((i) => `  - ${i.path.join(".") || "(akar)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      "Konfigurasi Beregam belum lengkap.\n" +
        rincian +
        "\n\nIsi variabel yang kurang di .env (lokal) atau Environment Variables hPanel.\n" +
        "Bangkitkan nilai rahasia dengan: openssl rand -hex 32"
    );
  }

  tersimpan = hasil.data;
  return tersimpan;
}

/**
 * Apakah modul Beregam sudah dikonfigurasi.
 *
 * Dipakai endpoint /health agar bisa melaporkan "belum dikonfigurasi"
 * alih-alih melempar galat 500 yang membingungkan.
 */
export function beregamSiap(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

/** Jeda acak dalam detik, sesuai aturan anti-blokir. */
export function jedaAcakDetik(): number {
  const { minDetik, maxDetik } = getConfig().jeda;
  return minDetik + Math.floor(Math.random() * (maxDetik - minDetik + 1));
}
