import * as z from "zod";

/**
 * KONTRAK API BEREGAM - SATU-SATUNYA SUMBER KEBENARAN.
 *
 * Berkas ini menentukan bentuk setiap payload yang dipertukarkan antara
 * PESTA (di Hostinger) dan worker (di PC kantor).
 *
 * Worker ada di repositori terpisah, github.com/HabibWafi/beregam. Ia
 * menyalin berkas ini lewat `npm run contracts:sync`. JANGAN pernah
 * mendefinisikan ulang bentuk payload di sisi worker - salah ketik nama
 * field akan lolos begitu saja dan baru ketahuan saat bot sudah jalan.
 *
 * ---------------------------------------------------------------------------
 * JABAT TANGAN VERSI
 *
 * Menyalin berkas hanya menjamin tipe cocok saat compile. Ia tidak menangkap
 * kasus yang paling berbahaya di sistem ini: worker versi lama masih
 * berjalan di PC sementara PESTA sudah ter-deploy versi baru. Worker itu
 * akan mengirim payload dengan bentuk lama, dan kegagalannya tampak seperti
 * "bot tiba-tiba tidak membalas" - butuh berjam-jam untuk ditelusuri.
 *
 * Karena itu setiap permintaan worker menyertakan header
 * `X-Contracts-Version`. Bila tidak cocok, PESTA membalas 409 dengan pesan
 * yang menyebut kedua versinya, sehingga penyebabnya langsung terbaca di
 * log worker.
 *
 * NAIKKAN VERSI INI setiap kali ada perubahan yang merusak kompatibilitas:
 * mengganti nama field, menghapus field, atau mengubah tipenya.
 * Menambah field opsional TIDAK perlu menaikkan versi.
 * ---------------------------------------------------------------------------
 */
export const CONTRACTS_VERSION = "1.0.0";

/** Nama header yang membawa versi kontrak. */
export const HEADER_CONTRACTS_VERSION = "x-contracts-version";
/** Nama header yang membawa kunci API worker. */
export const HEADER_API_KEY = "x-beregam-key";
/** Nama header yang menandai worker mana yang memanggil. */
export const HEADER_WORKER_ID = "x-worker-id";
/** Nama header yang membawa tanda tangan HMAC webhook. */
export const HEADER_WEBHOOK_HMAC = "x-webhook-hmac";

// ===========================================================================
// Webhook masuk (engine WhatsApp -> PESTA)
// ===========================================================================

/**
 * Payload webhook.
 *
 * Sengaja longgar (`passthrough`) karena bentuk persisnya ditentukan engine
 * dan bisa berubah antar versi. Yang divalidasi ketat hanya field yang
 * benar-benar dipakai; sisanya disimpan apa adanya ke kolom `raw`.
 */
export const webhookPayloadSchema = z
  .object({
    event: z.string().optional(),
    session: z.string().optional(),
    payload: z
      .object({
        /** Id pesan dari WhatsApp. Dipakai untuk deduplikasi. */
        id: z.string().optional(),
        /** Nomor lawan bicara, mis. 6285169881015@c.us */
        from: z.string().optional(),
        to: z.string().optional(),
        /**
         * true bila pesan ini dikirim oleh nomor kita sendiri.
         *
         * TIDAK diabaikan. Saat PC mati, admin membalas langsung dari HP,
         * dan balasan itu tiba sebagai fromMe. Kalau dibuang, jejak audit
         * bolong dan inbox terlihat seolah warga tidak pernah dijawab.
         */
        fromMe: z.boolean().optional(),
        body: z.string().optional(),
        type: z.string().optional(),
        /** Detik epoch dari WhatsApp. Dipakai untuk pagar pesan basi. */
        timestamp: z.number().optional(),
        notifyName: z.string().optional(),
        pushName: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// ===========================================================================
// Outbox (PESTA -> worker pesan)
// ===========================================================================

export const outboxItemSchema = z.object({
  id: z.number().int().positive(),
  waId: z.string(),
  type: z.string(),
  payload: z.object({
    text: z.string().optional(),
    header: z.string().optional(),
    items: z.array(z.string()).optional(),
  }),
  /** Detik jeda acak yang sudah diperhitungkan PESTA. */
  delaySeconds: z.number().int().min(0).default(0),
});

export type OutboxItem = z.infer<typeof outboxItemSchema>;

export const outboxResponseSchema = z.object({
  items: z.array(outboxItemSchema),
  serverTime: z.string(),
});

export type OutboxResponse = z.infer<typeof outboxResponseSchema>;

/** Konfirmasi hasil pengiriman dari worker. */
export const ackRequestSchema = z.object({
  status: z.enum(["sent", "failed"]),
  /** Id pesan dari WhatsApp, bila berhasil. */
  waMessageId: z.string().max(120).optional(),
  /** Pesan kesalahan, bila gagal. Jangan memuat nomor telepon lengkap. */
  error: z.string().max(500).optional(),
});

export type AckRequest = z.infer<typeof ackRequestSchema>;

// ===========================================================================
// Heartbeat worker pesan
// ===========================================================================

export const heartbeatRequestSchema = z.object({
  workerId: z.string().min(1).max(64),
  workerVersion: z.string().max(30).optional(),
  /** Status sesi engine, mis. "WORKING". */
  waSessionStatus: z.string().max(30).optional(),
  /** Detik sejak worker start. */
  uptime: z.number().int().min(0).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type HeartbeatRequest = z.infer<typeof heartbeatRequestSchema>;

export const heartbeatResponseSchema = z.object({
  ok: z.literal(true),
  serverTime: z.string(),
  /**
   * Saklar darurat dari admin panel.
   *
   * Worker tetap mengirim heartbeat saat false, tapi berhenti memproses
   * outbox. Berguna saat pemulihan: periksa dulu keadaannya, baru nyalakan.
   */
  botEnabled: z.boolean(),
  /**
   * Apakah worker ini pemegang sewa dan boleh memproses outbox.
   *
   * WhatsApp mengizinkan beberapa perangkat tertaut sekaligus, jadi PC
   * cadangan bisa ikut tertaut sejak awal. Tapi hanya satu worker yang
   * boleh bekerja - kalau tidak, warga menerima pesan dobel.
   */
  holdsLease: z.boolean(),
  maintenanceRan: z.boolean(),
});

export type HeartbeatResponse = z.infer<typeof heartbeatResponseSchema>;

// ===========================================================================
// AI worker (Fase 2)
// ===========================================================================

export const aiJobItemSchema = z.object({
  id: z.number().int().positive(),
  question: z.string(),
  mode: z.enum(["embed", "generate"]),
  channel: z.enum(["wa", "web"]),
  intent: z.string().nullable().optional(),
});

export type AiJobItem = z.infer<typeof aiJobItemSchema>;

export const aiJobResultRequestSchema = z.object({
  status: z.enum(["done", "failed"]),
  result: z.string().max(4000).optional(),
  score: z.number().min(0).max(1).optional(),
  contextUsed: z
    .array(
      z.object({
        kbId: z.number().int().optional(),
        score: z.number(),
        chunk: z.string(),
      })
    )
    .optional(),
  model: z.string().max(60).optional(),
  latencyMs: z.number().int().min(0).optional(),
  error: z.string().max(500).optional(),
});

export type AiJobResultRequest = z.infer<typeof aiJobResultRequestSchema>;

/**
 * Respons hasil AI job.
 *
 * Sengaja memuat teks final, supaya worker tidak perlu menunggu siklus
 * polling berikutnya. PESTA tetap satu-satunya pihak yang memutuskan apa
 * yang dikirim - worker hanya menyampaikannya.
 */
export const aiJobResultResponseSchema = z.object({
  ok: z.literal(true),
  replyText: z.string().nullable(),
});

export type AiJobResultResponse = z.infer<typeof aiJobResultResponseSchema>;

export const aiHeartbeatRequestSchema = z.object({
  workerId: z.string().min(1).max(64),
  aiMode: z.enum(["embedding_only", "embedding_plus_llm"]).optional(),
  embedModel: z.string().max(60).optional(),
  llmModel: z.string().max(60).optional(),
  indexedChunks: z.number().int().min(0).optional(),
  vramMb: z.number().int().min(0).optional(),
});

export type AiHeartbeatRequest = z.infer<typeof aiHeartbeatRequestSchema>;

// ===========================================================================
// Sinkronisasi basis pengetahuan (Fase 2)
// ===========================================================================

export const kbSyncItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  content: z.string(),
  category: z.string().nullable(),
  sourceRef: z.string().nullable(),
  contentHash: z.string().nullable(),
});

export type KbSyncItem = z.infer<typeof kbSyncItemSchema>;

export const kbSyncResponseSchema = z.object({
  items: z.array(kbSyncItemSchema),
  serverTime: z.string(),
});

export type KbSyncResponse = z.infer<typeof kbSyncResponseSchema>;

export const kbIndexedRequestSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
});

export type KbIndexedRequest = z.infer<typeof kbIndexedRequestSchema>;

// ===========================================================================
// Kesehatan sistem (dipanggil UptimeRobot, tanpa kunci API)
// ===========================================================================

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  serverTime: z.string(),
  /** Ringkas saja - endpoint ini publik, jangan membocorkan keadaan dalam. */
  checks: z.number().int(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// ===========================================================================
// Bentuk galat yang seragam
// ===========================================================================

export const errorResponseSchema = z.object({
  ok: z.literal(false),
  message: z.string(),
  /** Diisi khusus untuk galat ketidakcocokan versi kontrak. */
  contractsVersion: z.string().optional(),
  expectedVersion: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
