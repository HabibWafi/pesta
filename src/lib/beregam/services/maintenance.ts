import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, notExists, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  beregamAiJobs,
  beregamAlerts,
  beregamContacts,
  beregamHandovers,
  beregamHealth,
  beregamMessages,
  beregamOutbox,
  beregamSessions,
} from "../db/schema";
import { ambilHealth, pesanSamaDenganPayloadOutbox } from "../db/queries";
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
    //
    // Jendelanya 5 menit, bukan 2 - dilebarkan setelah ditemukan kasus nyata
    // warga menerima pesan menu YANG SAMA dua-tiga kali. Penyebabnya bukan
    // worker mati, tapi ack yang gagal SETELAH pesan sukses terkirim (mis.
    // sambungan ke PESTA sempat putus sesaat): baris tetap "locked" di sini
    // padahal WhatsApp-nya sudah terkirim, lalu langkah ini membebaskannya
    // lagi dan worker mengirim ulang sesuatu yang sebenarnya sudah sampai.
    // Perbaikan utamanya di worker (percobaan ulang ack, lihat pesta.ts),
    // jendela yang lebih lebar ini cuma lapis kedua - warga yang benar-benar
    // menunggu worker pulih dari mati total hanya menunggu 3 menit lebih
    // lama, jauh lebih murah daripada menerima balasan dobel.
    await db
      .update(beregamOutbox)
      .set({ status: "pending", lockedAt: null, lockedBy: null })
      .where(and(eq(beregamOutbox.status, "locked"), lt(beregamOutbox.lockedAt, tambahMenit(-5))));

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

    // --- 4. Bersihkan handover palsu milik kanal petugas -----------------
    // Sebelum pagar event fromMe ada, notifikasi yang dikirim bot ke nomor
    // petugas kadang dipantulkan WAHA lebih cepat daripada ACK worker. Event
    // itu lalu disangka balasan manual dan membuat handover untuk petugas
    // sendiri. Nomor BEREGAM_STAFF_WA tidak pernah menjadi warga yang
    // dilayani, jadi seluruh handover aktif miliknya pasti tidak sah.
    if (config.staffWaNumber) {
      const kontakPetugas = await db
        .select({ id: beregamContacts.id })
        .from(beregamContacts)
        .where(eq(beregamContacts.phone, config.staffWaNumber));
      const idKontakPetugas = kontakPetugas.map((kontak) => kontak.id);

      if (idKontakPetugas.length > 0) {
        const [ditutup] = await db
          .update(beregamHandovers)
          .set({
            status: "resolved",
            resolvedAt: sekarang,
            resolutionNote: "Dibatalkan otomatis: kontak adalah kanal kendali petugas",
          })
          .where(
            and(
              inArray(beregamHandovers.contactId, idKontakPetugas),
              inArray(beregamHandovers.status, ["open", "claimed"])
            )
          );

        await db
          .update(beregamSessions)
          .set({ mode: "bot", state: "idle", context: null, missCount: 0 })
          .where(inArray(beregamSessions.contactId, idKontakPetugas));

        if (ditutup.affectedRows > 0) {
          console.info(
            `[beregam] ${ditutup.affectedRows} handover palsu kanal petugas ditutup otomatis`
          );
        }
      }
    }

    // --- 5. Pulihkan handover palsu akibat race ACK ----------------------
    // Versi lama dapat mencatat satu kiriman worker dua kali: ACK mencatatnya
    // sebagai bot, sedangkan pantulan message.any dengan ID berbeda tercatat
    // sebagai agent_phone. Hanya pasangan dengan kontak, isi, dan waktu yang
    // sama persis yang dibersihkan. Pesan petugas yang isinya berbeda tidak
    // tersentuh.
    const kandidatPantulan = await db
      .select({
        handoverId: beregamHandovers.id,
        contactId: beregamHandovers.contactId,
        pesanId: beregamMessages.id,
        body: beregamMessages.body,
        raw: beregamMessages.raw,
        pesanAt: beregamMessages.createdAt,
      })
      .from(beregamHandovers)
      .innerJoin(
        beregamMessages,
        and(
          eq(beregamMessages.contactId, beregamHandovers.contactId),
          eq(beregamMessages.direction, "out"),
          eq(beregamMessages.source, "agent_phone")
        )
      )
      .where(
        and(
          eq(beregamHandovers.reason, "Percakapan dimulai petugas melalui WhatsApp Beregam"),
          inArray(beregamHandovers.status, ["open", "claimed"]),
          isNotNull(beregamMessages.body),
          sql`abs(timestampdiff(second, ${beregamMessages.createdAt}, ${beregamHandovers.createdAt})) <= 120`
        )
      )
      .orderBy(desc(beregamHandovers.id), desc(beregamMessages.id))
      .limit(50);

    let pantulanDibersihkan = 0;
    for (const kandidat of kandidatPantulan) {
      if (!kandidat.body) continue;

      const raw = kandidat.raw as { payload?: { source?: unknown } } | null;
      const sumberWaha = raw?.payload?.source;

      // `app` adalah bukti eksplisit bahwa petugas mengetik dari HP. Jangan
      // pernah membersihkannya, sekalipun isinya kebetulan sama dengan bot.
      if (sumberWaha === "app") continue;

      // Data baru membawa source=api sebagai bukti utama. Untuk data lama
      // yang belum memilikinya, cocokkan body terhadap payload outbox asli,
      // termasuk bentuk gabungan title+description+footer milik List Message.
      const outboxSekitar = await db
        .select({ payload: beregamOutbox.payload })
        .from(beregamOutbox)
        .where(
          and(
            eq(beregamOutbox.contactId, kandidat.contactId),
            eq(beregamOutbox.status, "sent"),
            gte(beregamOutbox.sentAt, tambahMenit(-2, kandidat.pesanAt)),
            lte(beregamOutbox.sentAt, tambahMenit(2, kandidat.pesanAt))
          )
        )
        .orderBy(desc(beregamOutbox.id))
        .limit(20);

      const cocokDenganOutbox = outboxSekitar.some(({ payload }) =>
        pesanSamaDenganPayloadOutbox(kandidat.body!, payload)
      );
      if (sumberWaha !== "api" && !cocokDenganOutbox) continue;

      const [ditutup] = await db
        .update(beregamHandovers)
        .set({
          status: "resolved",
          resolvedAt: sekarang,
          resolutionNote: "Dibatalkan otomatis: pantulan kiriman bot terbaca sebagai petugas",
        })
        .where(
          and(
            eq(beregamHandovers.id, kandidat.handoverId),
            inArray(beregamHandovers.status, ["open", "claimed"])
          )
        );

      if (ditutup.affectedRows === 0) continue;

      // Baris agent_phone ini terbukti salinan pesan bot, bukan percakapan
      // manusia. Hapus agar inbox tidak lagi menampilkan gelembung ganda.
      await db.delete(beregamMessages).where(eq(beregamMessages.id, kandidat.pesanId));

      const [handoverLain] = await db
        .select({ id: beregamHandovers.id })
        .from(beregamHandovers)
        .where(
          and(
            eq(beregamHandovers.contactId, kandidat.contactId),
            inArray(beregamHandovers.status, ["open", "claimed"])
          )
        )
        .limit(1);

      if (!handoverLain) {
        await db
          .update(beregamSessions)
          .set({ mode: "bot", state: "idle", context: null, missCount: 0 })
          .where(eq(beregamSessions.contactId, kandidat.contactId));
      }
      pantulanDibersihkan += 1;
    }

    if (pantulanDibersihkan > 0) {
      console.info(
        `[beregam] ${pantulanDibersihkan} handover palsu akibat pantulan bot dipulihkan`
      );
    }

    // --- 6. Mode manual yatim yang lupa dilepas ---------------------------
    // Handover aktif adalah flag bahwa petugas masih menangani warga. Sesi
    // seperti itu TIDAK BOLEH dilepas oleh timeout: bot baru boleh aktif lagi
    // setelah status handover diubah menjadi resolved lewat kendali "Selesai".
    // Timeout hanya memulihkan sesi manual yatim dari data lama/galat, yaitu
    // sesi yang tidak punya handover open atau claimed sebagai jalan selesai.
    const menganggur = tambahMenit(-config.manualModeTimeoutMinutes, sekarang);
    const handoverAktif = db
      .select({ id: beregamHandovers.id })
      .from(beregamHandovers)
      .where(
        and(
          eq(beregamHandovers.contactId, beregamSessions.contactId),
          inArray(beregamHandovers.status, ["open", "claimed"])
        )
      );
    const [dilepas] = await db
      .update(beregamSessions)
      .set({ mode: "bot", state: "idle" })
      .where(
        and(
          eq(beregamSessions.mode, "manual"),
          lt(beregamSessions.lastActivityAt, menganggur),
          notExists(handoverAktif)
        )
      );

    if (dilepas.affectedRows > 0) {
      console.info(
        `[beregam] ${dilepas.affectedRows} sesi dikembalikan ke bot setelah ` +
          `${config.manualModeTimeoutMinutes} menit tanpa aktivitas`
      );
    }

    // --- 7. Retensi payload mentah (PDP) ----------------------------------
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

    // --- 8. Penilaian otomatis setelah menganggur di menu ------------------
    // Sebelumnya penilaian hanya ditanyakan lewat kata kunci "nilai" atau
    // saat petugas menandai percakapan selesai - percakapan yang berhenti
    // begitu saja di bot (warga membaca jawabannya lalu pergi) tidak pernah
    // ditanya apa pun. Warga yang dibiarkan di menu (state "main_menu",
    // bukan sedang mengisi formulir atau menunggu petugas) selama
    // penilaianIdleMinutes tanpa membalas apa pun dianggap sudah selesai,
    // lalu ditanya penilaian di sini.
    //
    // mintaPenilaian() SENDIRI yang mengganti state sesi keluar dari
    // "main_menu" begitu terkirim, jadi baris yang sama tidak pernah
    // terjaring dua kali oleh query ini pada putaran berikutnya.
    const idleDiMenu = await db
      .select({ contactId: beregamSessions.contactId })
      .from(beregamSessions)
      .innerJoin(beregamContacts, eq(beregamContacts.id, beregamSessions.contactId))
      .where(
        and(
          eq(beregamSessions.state, "main_menu"),
          lt(beregamSessions.lastActivityAt, tambahMenit(-config.penilaianIdleMinutes, sekarang)),
          isNull(beregamContacts.optedOutAt),
          eq(beregamContacts.isBlocked, false)
        )
      );

    for (const { contactId } of idleDiMenu) {
      const [contact] = await db
        .select()
        .from(beregamContacts)
        .where(eq(beregamContacts.id, contactId))
        .limit(1);
      if (contact) await getBeregamService().mintaPenilaian(contact, null);
    }
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
