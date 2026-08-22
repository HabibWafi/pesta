import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  beregamAiJobs,
  beregamContacts,
  beregamHealth,
  beregamMessages,
  beregamOutbox,
  beregamSessions,
  type BeregamContact,
  type BeregamSession,
} from "./schema";
import { tambahDetik, tambahMenit } from "@/lib/waktu";
import { getConfig } from "../config";

/**
 * Query inti Beregam.
 *
 * Dua fungsi di sini - claimOutboxBatch dan claimAiJobBatch - adalah alasan
 * utama proyek ini memakai Drizzle. Keduanya memerlukan
 * `SELECT ... FOR UPDATE` di dalam transaksi, yang di Drizzle tersedia
 * sebagai `.for("update")`.
 */

/**
 * Mencari kontak berdasarkan waId, membuat bila belum ada.
 *
 * Sekaligus memperbarui lastSeenAt dan menaikkan messageCount, karena
 * ketiganya selalu terjadi bersamaan saat ada pesan masuk.
 */
export async function findOrCreateContactByWaId(
  waId: string,
  nama?: string | null,
  nomorTelepon?: string
): Promise<BeregamContact> {
  /*
   * `waId` BUKAN selalu nomor telepon.
   *
   * Sejak WhatsApp memakai pengalamatan LID, waId bisa berupa
   * "190666499973242@lid" - angka buram yang bukan nomor siapa pun.
   * Karena itu nomornya diterima sebagai parameter terpisah, hasil
   * nomorAsli() di src/lib/beregam/identitas.ts.
   *
   * Bila pemanggil tidak menyediakannya, angka dari waId hanya dipakai
   * kalau alamatnya memang BUKAN LID. Untuk LID, lebih baik kosong daripada
   * angka yang menyamar jadi nomor telepon.
   */
  const phone = (nomorTelepon ?? (waId.includes("@lid") ? "" : waId.replace(/[^0-9]/g, "")))
    .replace(/[^0-9]/g, "")
    .slice(0, 20);

  const [ada] = await db
    .select()
    .from(beregamContacts)
    .where(eq(beregamContacts.waId, waId))
    .limit(1);

  if (ada) {
    // Nomor asli baru diketahui belakangan? Perbaiki yang sudah tersimpan.
    // Ini yang menyembuhkan sendiri kontak lama yang terlanjur menyimpan
    // angka LID sebagai nomor telepon - tanpa perlu tindakan petugas.
    const perluPerbaikanNomor = Boolean(phone) && phone !== ada.phone;

    await db
      .update(beregamContacts)
      .set({
        lastSeenAt: new Date(),
        messageCount: sql`${beregamContacts.messageCount} + 1`,
        // Nama profil WhatsApp bisa berubah; ikuti yang terbaru bila ada.
        ...(nama && nama !== ada.name ? { name: nama.slice(0, 120) } : {}),
        ...(perluPerbaikanNomor ? { phone } : {}),
      })
      .where(eq(beregamContacts.id, ada.id));

    return {
      ...ada,
      ...(perluPerbaikanNomor ? { phone } : {}),
      ...(nama && nama !== ada.name ? { name: nama.slice(0, 120) } : {}),
      lastSeenAt: new Date(),
      messageCount: ada.messageCount + 1,
    };
  }

  const sekarang = new Date();
  const [dibuat] = await db
    .insert(beregamContacts)
    .values({
      waId,
      phone,
      name: nama?.slice(0, 120) ?? null,
      messageCount: 1,
      firstSeenAt: sekarang,
      lastSeenAt: sekarang,
    })
    .$returningId();

  const [baru] = await db
    .select()
    .from(beregamContacts)
    .where(eq(beregamContacts.id, dibuat.id))
    .limit(1);

  return baru;
}

/** Mengambil sesi kontak, membuat bila belum ada. */
export async function ambilAtauBuatSesi(contactId: number): Promise<BeregamSession> {
  const [ada] = await db
    .select()
    .from(beregamSessions)
    .where(eq(beregamSessions.contactId, contactId))
    .limit(1);

  if (ada) return ada;

  const sekarang = new Date();
  await db.insert(beregamSessions).values({
    contactId,
    state: "idle",
    mode: "bot",
    lastActivityAt: sekarang,
    expiresAt: tambahMenit(getConfig().sessionTtlMinutes, sekarang),
  });

  const [baru] = await db
    .select()
    .from(beregamSessions)
    .where(eq(beregamSessions.contactId, contactId))
    .limit(1);

  return baru;
}

/**
 * Mengambil dan MENGUNCI sekumpulan pesan yang siap dikirim.
 *
 * Inti pola outbox. Dijalankan dalam satu transaksi:
 *   1. SELECT ... FOR UPDATE mengunci barisnya di tingkat database
 *   2. UPDATE menandainya `locked` beserta identitas worker
 *
 * Tanpa penguncian ini, dua worker yang polling bersamaan bisa mengambil
 * baris yang sama dan warga menerima pesan dobel. Ini juga yang membuat
 * PC cadangan aman dinyalakan berbarengan dengan PC utama.
 */
export async function claimOutboxBatch(
  limit: number,
  workerId: string
): Promise<{ id: number; waId: string; type: string; payload: unknown }[]> {
  const batas = Math.min(Math.max(limit, 1), 10);

  return db.transaction(async (tx) => {
    const kandidat = await tx
      .select({
        id: beregamOutbox.id,
        waId: beregamOutbox.waId,
        type: beregamOutbox.type,
        payload: beregamOutbox.payload,
      })
      .from(beregamOutbox)
      .where(
        and(
          eq(beregamOutbox.status, "pending"),
          // `scheduled_at` boleh NULL, artinya "kirim secepatnya".
          //
          // Tanpa cabang IS NULL, baris semacam itu tidak akan pernah
          // terjemput: di SQL, `NULL <= sekarang` bernilai NULL, bukan benar.
          // Barisnya diam di status `pending` selamanya - tanpa galat, tanpa
          // percobaan ulang, tanpa jejak apa pun di log. Warga menunggu
          // balasan yang tidak akan datang, dan tidak ada yang tahu.
          or(
            isNull(beregamOutbox.scheduledAt),
            lte(beregamOutbox.scheduledAt, new Date())
          )
        )
      )
      // NULL diurutkan lebih dulu oleh MySQL, jadi pesan "kirim secepatnya"
      // memang mendapat giliran paling awal - persis yang diinginkan.
      .orderBy(asc(beregamOutbox.scheduledAt), asc(beregamOutbox.id))
      .limit(batas)
      .for("update");

    if (kandidat.length === 0) return [];

    await tx
      .update(beregamOutbox)
      .set({ status: "locked", lockedAt: new Date(), lockedBy: workerId })
      .where(
        inArray(
          beregamOutbox.id,
          kandidat.map((k) => k.id)
        )
      );

    return kandidat;
  });
}

/** Pola penguncian yang sama untuk antrean pekerjaan AI. */
export async function claimAiJobBatch(
  limit: number,
  workerId: string
): Promise<{ id: number; question: string; mode: "embed" | "generate"; channel: "wa" | "web"; intent: string | null }[]> {
  const batas = Math.min(Math.max(limit, 1), 5);

  return db.transaction(async (tx) => {
    const kandidat = await tx
      .select({
        id: beregamAiJobs.id,
        question: beregamAiJobs.question,
        mode: beregamAiJobs.mode,
        channel: beregamAiJobs.channel,
        intent: beregamAiJobs.intent,
      })
      .from(beregamAiJobs)
      .where(eq(beregamAiJobs.status, "pending"))
      .orderBy(asc(beregamAiJobs.createdAt), asc(beregamAiJobs.id))
      .limit(batas)
      .for("update");

    if (kandidat.length === 0) return [];

    await tx
      .update(beregamAiJobs)
      .set({ status: "locked", lockedAt: new Date(), lockedBy: workerId })
      .where(
        inArray(
          beregamAiJobs.id,
          kandidat.map((k) => k.id)
        )
      );

    return kandidat;
  });
}

/**
 * Baris kesehatan sistem (id = 1), dibuat bila belum ada.
 *
 * Selalu satu baris. Dibuat otomatis supaya tidak perlu seeder terpisah
 * yang bisa terlupa dijalankan di server.
 */
export async function ambilHealth() {
  const [ada] = await db.select().from(beregamHealth).where(eq(beregamHealth.id, 1)).limit(1);
  if (ada) return ada;

  await db.insert(beregamHealth).values({ id: 1, botEnabled: true });
  const [baru] = await db.select().from(beregamHealth).where(eq(beregamHealth.id, 1)).limit(1);
  return baru;
}

/**
 * Mencoba memperbarui sewa kepemilikan worker.
 *
 * Mengembalikan true bila worker ini yang berhak memproses outbox.
 * Sewa berpindah otomatis bila pemegangnya berhenti memperbarui - itu yang
 * membuat PC cadangan bisa mengambil alih tanpa campur tangan manusia.
 */
export async function perbaruiSewa(workerId: string): Promise<boolean> {
  const health = await ambilHealth();
  const sekarang = new Date();
  const sewaBaru = tambahDetik(getConfig().leaseSeconds, sekarang);

  const sewaKosong = !health.leaseExpiresAt || health.leaseExpiresAt < sekarang;
  const miliknya = health.activeWorkerId === workerId;

  if (sewaKosong || miliknya) {
    await db
      .update(beregamHealth)
      .set({ activeWorkerId: workerId, leaseExpiresAt: sewaBaru })
      .where(eq(beregamHealth.id, 1));
    return true;
  }

  return false;
}

/**
 * Menghitung berapa balasan yang sudah dikirim ke kontak ini dalam semenit.
 *
 * Memakai index gabungan (contact_id, direction, created_at). Tanpa index
 * itu, query ini dijalankan pada setiap pesan masuk dan akan terasa mahal
 * begitu tabel pesan tumbuh.
 */
export async function hitungBalasanSemenit(contactId: number): Promise<number> {
  const [baris] = await db
    .select({ n: sql<number>`count(*)` })
    .from(beregamMessages)
    .where(
      and(
        eq(beregamMessages.contactId, contactId),
        eq(beregamMessages.direction, "out"),
        gte(beregamMessages.createdAt, tambahMenit(-1))
      )
    );
  return Number(baris?.n ?? 0);
}

/** Jumlah pesan keluar yang benar-benar terkirim hari ini (UTC). */
export async function hitungKirimHariIni(): Promise<number> {
  const [baris] = await db
    .select({ n: sql<number>`count(*)` })
    .from(beregamOutbox)
    .where(
      and(
        eq(beregamOutbox.status, "sent"),
        sql`date(${beregamOutbox.sentAt}) = curdate()`
      )
    );
  return Number(baris?.n ?? 0);
}

/** Apakah pesan dengan id WhatsApp ini sudah pernah disimpan. */
export async function pesanSudahAda(waMessageId: string): Promise<boolean> {
  const [ada] = await db
    .select({ id: beregamMessages.id })
    .from(beregamMessages)
    .where(eq(beregamMessages.waMessageId, waMessageId))
    .limit(1);
  return Boolean(ada);
}

/** Pesan terakhir pada satu kontak dengan arah tertentu. */
export async function pesanTerakhir(contactId: number, direction: "in" | "out") {
  const [baris] = await db
    .select()
    .from(beregamMessages)
    .where(
      and(eq(beregamMessages.contactId, contactId), eq(beregamMessages.direction, direction))
    )
    .orderBy(desc(beregamMessages.id))
    .limit(1);
  return baris ?? null;
}

/**
 * Ringkasan keadaan untuk panel kendali di PC kantor.
 *
 * Semua hitungan diambil dalam satu perjalanan ke database. Panel memanggil
 * ini berulang kali - sekali tiap beberapa detik - dan Hostinger punya batas
 * Entry Process, jadi satu query gabungan jauh lebih murah daripada sepuluh
 * query kecil yang masing-masing meminjam koneksi dari pool.
 */
export async function ringkasanStatus() {
  const health = await ambilHealth();

  const awalHariUtc = new Date();
  awalHariUtc.setUTCHours(0, 0, 0, 0);

  const hasil = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM beregam_outbox WHERE status = 'pending')   AS pending,
      (SELECT COUNT(*) FROM beregam_outbox WHERE status = 'locked')    AS locked,
      (SELECT COUNT(*) FROM beregam_outbox WHERE status = 'sent')      AS sent,
      (SELECT COUNT(*) FROM beregam_outbox WHERE status = 'failed')    AS failed,
      (SELECT COUNT(*) FROM beregam_outbox WHERE status = 'cancelled') AS cancelled,
      (SELECT MIN(created_at) FROM beregam_outbox WHERE status IN ('pending','locked')) AS tertua,
      (SELECT COUNT(*) FROM beregam_messages
         WHERE direction = 'in'  AND created_at >= ${awalHariUtc})     AS masuk,
      (SELECT COUNT(*) FROM beregam_messages
         WHERE direction = 'out' AND created_at >= ${awalHariUtc})     AS keluar,
      (SELECT COUNT(*) FROM beregam_sessions)                          AS sesi,
      (SELECT COUNT(*) FROM beregam_sessions WHERE mode = 'manual')    AS manual,
      (SELECT COUNT(*) FROM beregam_alerts WHERE resolved_at IS NULL)  AS alert
  `);

  // Driver mysql2 mengembalikan [baris, keterangan kolom]; tipe bawaan
  // Drizzle untuk execute() tidak membedakan SELECT dari INSERT, jadi
  // bentuknya ditegaskan di sini - satu-satunya tempat yang perlu tahu.
  const baris = (hasil as unknown as [Record<string, unknown>[], unknown])[0]?.[0];

  const r = baris ?? {};
  const angka = (v: unknown) => Number(v ?? 0);

  // Umur antrean tertua dihitung di Node, bukan di SQL: zona waktu MySQL
  // belum tentu UTC, sedangkan seluruh timestamp disimpan dalam UTC.
  const tertua = r.tertua ? new Date(`${String(r.tertua).replace(" ", "T")}Z`) : null;
  const tertuaDetik =
    tertua && !Number.isNaN(tertua.getTime())
      ? Math.max(0, Math.floor((Date.now() - tertua.getTime()) / 1000))
      : null;

  return {
    botEnabled: Boolean(health?.botEnabled),
    activeWorkerId: health?.activeWorkerId ?? null,
    leaseExpiresAt: health?.leaseExpiresAt?.toISOString() ?? null,
    workerLastSeenAt: health?.workerLastSeenAt?.toISOString() ?? null,
    waSessionStatus: health?.waSessionStatus ?? null,
    outbox: {
      pending: angka(r.pending),
      locked: angka(r.locked),
      sent: angka(r.sent),
      failed: angka(r.failed),
      cancelled: angka(r.cancelled),
      tertuaDetik,
    },
    pesan: { masukHariIni: angka(r.masuk), keluarHariIni: angka(r.keluar) },
    sesi: { total: angka(r.sesi), manual: angka(r.manual) },
    alertTerbuka: angka(r.alert),
  };
}
