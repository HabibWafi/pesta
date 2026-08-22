import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamOutbox, type SumberPesan } from "@/lib/beregam/db/schema";
import { otorisasiWorker } from "@/lib/beregam/auth";
import { ackRequestSchema } from "@/lib/beregam/contracts";
import { getBeregamService } from "@/lib/beregam/services/beregam-service";
import { beregamContacts } from "@/lib/beregam/db/schema";
import { tambahDetik } from "@/lib/waktu";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Backoff bertingkat setelah gagal kirim.
 *
 * Bukan mengulang secepat mungkin: kegagalan biasanya berarti internet
 * putus atau engine sedang bermasalah, dan mencoba terus hanya memperbesar
 * risiko nomor dianggap mencurigakan.
 */
const BACKOFF_DETIK = [30, 120, 600];

/** Worker mengonfirmasi hasil pengiriman satu pesan. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const izin = otorisasiWorker(req);
  if (!izin.ok) return izin.respons;

  const { id: idTeks } = await ctx.params;
  const id = Number(idTeks);
  if (!id) {
    return NextResponse.json({ ok: false, message: "Id tidak sah." }, { status: 400 });
  }

  try {
    const data = ackRequestSchema.parse(await req.json());

    const [baris] = await db
      .select()
      .from(beregamOutbox)
      .where(eq(beregamOutbox.id, id))
      .limit(1);

    if (!baris) {
      return NextResponse.json({ ok: false, message: "Antrean tidak ditemukan." }, { status: 404 });
    }

    // --- Berhasil ---
    if (data.status === "sent") {
      await db
        .update(beregamOutbox)
        .set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(eq(beregamOutbox.id, id));

      // Catat ke riwayat supaya muncul di inbox petugas dan terhitung
      // dalam pembatas laju. `source` disisipkan di payload saat pesan
      // diantrekan (lihat openwa-driver.ts) - di sinilah nilainya dibaca
      // kembali, supaya inbox bisa membedakan balasan bot, FAQ, dan petugas.
      const payload = baris.payload as { text?: string; source?: SumberPesan | null } | null;
      await getBeregamService().catatPesan({
        contactId: baris.contactId,
        direction: "out",
        waMessageId: data.waMessageId ?? null,
        type: baris.type,
        body: payload?.text ?? null,
        source: payload?.source ?? null,
        sentBy: baris.sentBy,
      });

      return NextResponse.json({ ok: true });
    }

    // --- Gagal ---
    const percobaan = baris.attempts + 1;

    if (percobaan < BACKOFF_DETIK.length) {
      await db
        .update(beregamOutbox)
        .set({
          status: "pending",
          attempts: percobaan,
          lastError: data.error?.slice(0, 500) ?? "gagal tanpa keterangan",
          lockedAt: null,
          lockedBy: null,
          scheduledAt: tambahDetik(BACKOFF_DETIK[percobaan - 1]),
        })
        .where(eq(beregamOutbox.id, id));

      return NextResponse.json({ ok: true, diulang: true, percobaan });
    }

    // Sudah tiga kali gagal. Berhenti mencoba, serahkan ke petugas -
    // warga tidak boleh dibiarkan menunggu jawaban yang tidak akan datang.
    await db
      .update(beregamOutbox)
      .set({
        status: "failed",
        attempts: percobaan,
        lastError: data.error?.slice(0, 500) ?? "gagal tanpa keterangan",
        lockedAt: null,
        lockedBy: null,
      })
      .where(eq(beregamOutbox.id, id));

    const [contact] = await db
      .select()
      .from(beregamContacts)
      .where(eq(beregamContacts.id, baris.contactId))
      .limit(1);

    if (contact) {
      await getBeregamService().escalate(contact, "Gagal kirim 3x");
    }

    return NextResponse.json({ ok: true, diserahkanKePetugas: true });
  } catch (error) {
    console.error("[beregam] gagal memproses ack:", error);
    return NextResponse.json({ ok: false, message: "Gagal memproses konfirmasi." }, { status: 500 });
  }
}
