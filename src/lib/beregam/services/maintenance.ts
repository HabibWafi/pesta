import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  beregamAiJobs,
  beregamAlerts,
  beregamHandovers,
  beregamHealth,
  beregamMessages,
  beregamOutbox,
  beregamSessions,
} from "../db/schema";
import { ambilHealth } from "../db/queries";
import { getConfig } from "../config";
import { lebihTuaDari, tambahMenit } from "@/lib/waktu";
import { getBeregamService } from "./beregam-service";

/**
 * Pemeliharaan berkala, DIPICU WORKER - bukan cron.
 *
 * Worker sudah memanggil /heartbeat tiap 60 detik, jadi menambahkan cron
 * hPanel hanya menambah satu hal lagi yang bisa lupa dikonfigurasi dan
 * lupa dipantau. Endpoint heartbeat sekaligus menjalankan berkas ini,
 * dijaga kunci waktu agar tidak berjalan ganda.
 *
 * Semua operasi di sini harus idempoten dan cepat (di bawah 500 ms).
 */

/** Menyalakan alert, atau memperbarui yang sudah ada. Anti-spam bawaan. */
export async function nyalakanAlert(
  kode: string,
  pesan: string,
  severity: "info" | "warning" | "critical" = "warning",
  meta?: Record<string, unknown>
): Promise<void> {
  const [ada] = await db
    .select({ id: beregamAlerts.id, lastSeenAt: beregamAlerts.lastSeenAt })
    .from(beregamAlerts)
    .where(and(eq(beregamAlerts.kode, kode), sql`${beregamAlerts.resolvedAt} is null`))
    .limit(1);

  const sekarang = new Date();

  if (ada) {
    // Alert yang sama tidak ditulis ulang lebih sering dari 30 menit.
    if (!lebihTuaDari(30, ada.lastSeenAt)) return;
    await db
      .update(beregamAlerts)
      .set({ lastSeenAt: sekarang, pesan })
      .where(eq(beregamAlerts.id, ada.id));
    return;
  }

  await db.insert(beregamAlerts).values({
    kode,
    severity,
    pesan,
    meta: meta ?? null,
    lastSeenAt: sekarang,
  });
}

/** Menutup alert saat keadaannya sudah pulih. */
export async function tutupAlert(kode: string): Promise<void> {
  await db
    .update(beregamAlerts)
    .set({ resolvedAt: new Date() })
    .where(and(eq(beregamAlerts.kode, kode), sql`${beregamAlerts.resolvedAt} is null`));
}

/**
 * Menjalankan pemeliharaan bila sudah lewat 60 detik sejak terakhir.
 *
 * Penanda waktunya diperbarui secara atomik lebih dulu, sehingga dua
 * heartbeat yang tiba bersamaan tidak menjalankannya dua kali.
 */
export async function runMaintenanceBilaPerlu(): Promise<boolean> {
  const health = await ambilHealth();

  if (health.maintenanceRanAt && Date.now() - health.maintenanceRanAt.getTime() < 60_000) {
    return false;
  }

  // Klaim slot lebih dulu. Bila baris sudah diubah proses lain sejak kita
  // membacanya, affectedRows akan 0 dan kita mundur.
  const [hasil] = await db
    .update(beregamHealth)
    .set({ maintenanceRanAt: new Date() })
    .where(
      and(
        eq(beregamHealth.id, 1),
        health.maintenanceRanAt
          ? eq(beregamHealth.maintenanceRanAt, health.maintenanceRanAt)
          : sql`${beregamHealth.maintenanceRanAt} is null`
      )
    );

  if (hasil.affectedRows === 0) return false;

  await runMaintenance();
  return true;
}

/** Isi pemeliharaannya. Idempoten. */
export async function runMaintenance(): Promise<void> {
  const config = getConfig();
  const sekarang = new Date();

  try {
    // --- 1. Outbox yang macet terkunci ------------------------------------
    // Worker mati di tengah pengiriman meninggalkan baris berstatus locked
    // selamanya. Dikembalikan ke pending agar bisa diambil worker lain.
    await db
      .update(beregamOutbox)
      .set({ status: "pending", lockedAt: null, lockedBy: null })
      .where(and(eq(beregamOutbox.status, "locked"), lt(beregamOutbox.lockedAt, tambahMenit(-2))));

    // --- 2. Pekerjaan AI yang macet ---------------------------------------
    await db
      .update(beregamAiJobs)
      .set({ status: "pending", lockedAt: null, lockedBy: null })
      .where(and(eq(beregamAiJobs.status, "locked"), lt(beregamAiJobs.lockedAt, tambahMenit(-3))));

    // --- 3. Outbox basi ---------------------------------------------------
    // Balasan yang ditulis sebelum PC mati tidak boleh terkirim berjam-jam
    // kemudian - warga sudah dijawab admin lewat HP, dan pesan susulan dari
    // bot hanya membingungkan.
    await db
      .update(beregamOutbox)
      .set({ status: "cancelled", lastError: "Dibatalkan: sudah terlalu lama tertahan" })
      .where(
        and(eq(beregamOutbox.status, "pending"), lt(beregamOutbox.scheduledAt, tambahMenit(-120)))
      );

    // --- 4. Mode manual yang lupa dilepas ---------------------------------
    // Petugas sering lupa menekan "Selesai". Tanpa ini, kontak tersebut
    // tidak akan pernah dilayani bot lagi.
    const menganggur = tambahMenit(-config.manualModeTimeoutMinutes, sekarang);
    const [dilepas] = await db
      .update(beregamSessions)
      .set({ mode: "bot", state: "idle" })
      .where(
        and(eq(beregamSessions.mode, "manual"), lt(beregamSessions.lastActivityAt, menganggur))
      );

    if (dilepas.affectedRows > 0) {
      console.info(
        `[beregam] ${dilepas.affectedRows} sesi dikembalikan ke bot setelah ` +
          `${config.manualModeTimeoutMinutes} menit tanpa aktivitas`
      );
    }

    // --- 5. Retensi payload mentah (PDP) ----------------------------------
    // Panduan menyuruh mengosongkan `raw` yang lebih tua dari 90 hari tapi
    // tidak pernah menyebut siapa yang menjalankannya. Ini pelaksananya.
    await db
      .update(beregamMessages)
      .set({ raw: null })
      .where(
        and(
          isNotNull(beregamMessages.raw),
          lt(beregamMessages.createdAt, tambahMenit(-90 * 24 * 60, sekarang))
        )
      );
  } catch (error) {
    console.error("[beregam] pemeliharaan gagal:", error);
    await nyalakanAlert(
      "pemeliharaan_gagal",
      "runMaintenance() melempar galat. Periksa log server.",
      "critical"
    );
  }
}

/**
 * Watchdog - mendeteksi komponen yang mati.
 *
 * TIDAK BOLEH dipicu worker: pemicunya tidak boleh pihak yang sedang mati.
 * Karena itu dijalankan sebagai efek samping GET /api/beregam/health, yang
 * di-ping UptimeRobot tiap 5 menit secara gratis.
 *
 * Notifikasi berupa baris di beregam_alerts dan log server. TIDAK dikirim
 * lewat WhatsApp - ironis kalau peringatan "bot mati" dikirim lewat bot
 * yang sedang mati.
 */
export async function runWatchdog(): Promise<{
  status: "ok" | "degraded" | "down";
  jumlahMasalah: number;
}> {
  const config = getConfig();
  const health = await ambilHealth();
  let masalah = 0;
  let parah = 0;

  // --- Worker pesan ---
  if (lebihTuaDari(5, health.workerLastSeenAt)) {
    parah += 1;
    await nyalakanAlert(
      "worker_mati",
      "Worker pesan tidak mengirim heartbeat lebih dari 5 menit. " +
        "Periksa PC kantor: listrik, internet, dan status container.",
      "critical"
    );
  } else {
    await tutupAlert("worker_mati");
  }

  // --- Sesi WhatsApp ---
  if (health.waSessionStatus && health.waSessionStatus !== "WORKING") {
    parah += 1;
    await nyalakanAlert(
      "sesi_wa_bermasalah",
      `Status sesi WhatsApp: ${health.waSessionStatus}. ` +
        "Kemungkinan perlu ditautkan ulang lewat pairing code.",
      "critical"
    );
  } else {
    await tutupAlert("sesi_wa_bermasalah");
  }

  // --- AI worker (hanya bila diaktifkan) ---
  if (config.ai.enabled && lebihTuaDari(10, health.aiWorkerLastSeenAt)) {
    masalah += 1;
    await nyalakanAlert(
      "ai_worker_mati",
      "AI worker tidak mengirim heartbeat lebih dari 10 menit. " +
        "Bot tetap berjalan dengan menu, hanya pencarian semantik yang mati.",
      "warning"
    );
  } else if (config.ai.enabled) {
    await tutupAlert("ai_worker_mati");
  }

  // --- Kegagalan kirim menumpuk ---
  const [gagal] = await db
    .select({ n: sql<number>`count(*)` })
    .from(beregamOutbox)
    .where(and(eq(beregamOutbox.status, "failed"), sql`${beregamOutbox.updatedAt} > now() - interval 1 hour`));

  if (Number(gagal?.n ?? 0) > 5) {
    masalah += 1;
    await nyalakanAlert(
      "kirim_gagal_menumpuk",
      `${gagal.n} pesan gagal terkirim dalam satu jam terakhir.`,
      "warning"
    );
  } else {
    await tutupAlert("kirim_gagal_menumpuk");
  }

  // --- Warga menunggu terlalu lama ---
  // Hanya diperiksa pada jam layanan. Di luar jam kerja, handover yang
  // menganggur adalah hal wajar dan tidak perlu membangunkan siapa pun.
  if (await getBeregamService().isJamLayanan()) {
    const [tertahan] = await db
      .select({ n: sql<number>`count(*)` })
      .from(beregamHandovers)
      .where(
        and(
          eq(beregamHandovers.status, "open"),
          lt(beregamHandovers.createdAt, tambahMenit(-240))
        )
      );

    if (Number(tertahan?.n ?? 0) > 0) {
      masalah += 1;
      await nyalakanAlert(
        "handover_menganggur",
        `${tertahan.n} warga menunggu balasan petugas lebih dari 4 jam pada jam layanan.`,
        "warning"
      );
    } else {
      await tutupAlert("handover_menganggur");
    }
  }

  const total = masalah + parah;
  return {
    status: parah > 0 ? "down" : total > 0 ? "degraded" : "ok",
    jumlahMasalah: total,
  };
}
