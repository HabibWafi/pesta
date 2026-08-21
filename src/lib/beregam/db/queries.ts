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
  nama?: string | null
): Promise<BeregamContact> {
  const phone = waId.replace(/[^0-9]/g, "").slice(0, 20);

  const [ada] = await db
    .select()
    .from(beregamContacts)
    .where(eq(beregamContacts.waId, waId))
    .limit(1);

  if (ada) {
    await db
      .update(beregamContacts)
      .set({
        lastSeenAt: new Date(),
        messageCount: sql`${beregamContacts.messageCount} + 1`,
        // Nama profil WhatsApp bisa berubah; ikuti yang terbaru bila ada.
        ...(nama && nama !== ada.name ? { name: nama.slice(0, 120) } : {}),
      })
      .where(eq(beregamContacts.id, ada.id));

    return { ...ada, lastSeenAt: new Date(), messageCount: ada.messageCount + 1 };
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
