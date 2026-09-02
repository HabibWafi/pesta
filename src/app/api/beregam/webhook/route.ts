import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { findOrCreateContactByWaId, pesanSudahAda, pesanTerakhir } from "@/lib/beregam/db/queries";
import { webhookSah, HEADER_WEBHOOK_HMAC } from "@/lib/beregam/auth";
import { webhookPayloadSchema } from "@/lib/beregam/contracts";
import { namaProfil, nomorAsli } from "@/lib/beregam/identitas";
import { getConfig } from "@/lib/beregam/config";
import { getBeregamService } from "@/lib/beregam/services/beregam-service";
import { beregamHandovers, beregamSessions } from "@/lib/beregam/db/schema";
import { samarkanNomor } from "@/lib/waktu";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Webhook dari engine WhatsApp.
 *
 * URUTAN LANGKAHNYA TIDAK BOLEH DIUBAH. Tiga hal yang paling mudah salah:
 *
 * 1. HMAC dihitung atas RAW BODY. `await req.text()` HARUS dipanggil lebih
 *    dulu. Memakai `req.json()` duluan mengubah byte-nya - urutan kunci,
 *    spasi, presisi angka - sehingga tanda tangan tidak akan pernah cocok,
 *    dan penyebabnya sangat sulit ditelusuri.
 *
 * 2. SELALU balas 200, bahkan saat pemrosesan gagal. Bila handler ini
 *    melempar 500, engine akan menganggap pengirimannya gagal lalu mengulang
 *    - dan warga menerima balasan dobel.
 *
 * 3. Balas CEPAT. Seluruh handler harus selesai di bawah 2 detik; engine
 *    akan timeout dan mengulang kirim bila menunggu lama.
 */
export async function POST(req: Request) {
  // LANGKAH 1 - raw body, sebelum parsing apa pun.
  const raw = await req.text();

  // LANGKAH 2 - verifikasi tanda tangan.
  try {
    if (!webhookSah(raw, req.headers.get(HEADER_WEBHOOK_HMAC))) {
      console.warn("[beregam] webhook ditolak: HMAC tidak cocok");
      return NextResponse.json({ ok: false, message: "Tanda tangan tidak sah." }, { status: 401 });
    }
  } catch (error) {
    console.error("[beregam] konfigurasi webhook bermasalah:", error);
    return NextResponse.json(
      { ok: false, message: "Modul Beregam belum dikonfigurasi." },
      { status: 503 }
    );
  }

  // LANGKAH 3 - baru parse.
  let data;
  try {
    data = webhookPayloadSchema.parse(JSON.parse(raw));
  } catch {
    // Bentuk tak dikenal bukan alasan menyuruh engine mengulang kirim.
    return NextResponse.json({ ok: true, diabaikan: "bentuk tidak dikenali" });
  }

  const p = data.payload;
  const chatId = p?.from ?? "";

  // LANGKAH 4 - saring yang tidak perlu diproses. Semua dijawab 200.
  if (data.event && data.event !== "message") {
    return NextResponse.json({ ok: true, diabaikan: "bukan peristiwa pesan" });
  }
  if (!chatId || !p?.id) {
    return NextResponse.json({ ok: true, diabaikan: "payload tidak lengkap" });
  }
  if (chatId.includes("@g.us")) {
    return NextResponse.json({ ok: true, diabaikan: "pesan grup" });
  }
  if (chatId === "status@broadcast") {
    return NextResponse.json({ ok: true, diabaikan: "status broadcast" });
  }

  // LANGKAH 5 - deduplikasi. UNIQUE di database adalah pengaman keduanya.
  try {
    if (await pesanSudahAda(p.id)) {
      return NextResponse.json({ ok: true, diabaikan: "duplikat" });
    }
  } catch (error) {
    console.error("[beregam] gagal memeriksa duplikat:", error);
    return NextResponse.json({ ok: true });
  }

  // LANGKAH 6 - proses. Dibungkus try-catch: galat apa pun tetap dijawab 200.
  try {
    await proses(data, chatId, p);
  } catch (error) {
    console.error("[beregam] gagal memproses webhook:", error);
  }

  return NextResponse.json({ ok: true });
}

type Payload = NonNullable<ReturnType<typeof webhookPayloadSchema.parse>["payload"]>;

async function proses(
  data: ReturnType<typeof webhookPayloadSchema.parse>,
  chatId: string,
  p: Payload
): Promise<void> {
  const config = getConfig();
  const service = getBeregamService();

  /*
   * chatId bisa berupa LID ("...@lid"), bukan nomor telepon. Nomor aslinya
   * diambil terpisah dari payload - lihat penjelasan lengkap di
   * src/lib/beregam/identitas.ts. Nama profil juga tersembunyi di dalam
   * `_data` pada payload LID, yang membuat kontak sempat tersimpan tanpa
   * nama sama sekali.
   */
  const nama = namaProfil(p);
  const contact = await findOrCreateContactByWaId(chatId, nama, nomorAsli(p));

  // Umur pesan menurut cap waktu WhatsApp. Dipakai pagar pesan basi.
  const umurMenit = p.timestamp
    ? (Date.now() - p.timestamp * 1000) / 60_000
    : 0;
  const basi = umurMenit > config.staleThresholdMinutes;

  // -------------------------------------------------------------------------
  // PESAN DARI NOMOR KITA SENDIRI (fromMe)
  //
  // Terjadi saat PC mati dan admin membalas langsung dari HP pemegang SIM.
  // Panduan lama mengabaikan fromMe sepenuhnya - akibatnya seluruh balasan
  // admin tidak pernah tercatat, dan inbox terlihat seolah warga tidak
  // pernah dijawab. Justru itu hal paling bernilai dari sistem ini.
  // -------------------------------------------------------------------------
  if (p.fromMe) {
    await service.catatPesan({
      contactId: contact.id,
      direction: "out",
      waMessageId: p.id,
      type: p.type ?? "text",
      body: p.body ?? null,
      source: "agent_phone",
      raw: data,
    });

    // Bila admin sudah membalas lebih baru daripada pesan masuk terakhir,
    // anggap ia sedang memegang percakapan itu. Bot diam sampai dilepas
    // lewat inbox - tanpa ini, bot bisa merebut percakapan yang sedang
    // ditangani manusia saat PC pulih.
    const masukTerakhir = await pesanTerakhir(contact.id, "in");
    if (masukTerakhir) {
      const sekarang = new Date();
      await db
        .update(beregamSessions)
        .set({ mode: "manual", state: "manual", lastActivityAt: sekarang })
        .where(eq(beregamSessions.contactId, contact.id));

      // Balasan langsung dari HP tidak melewati endpoint admin, sehingga
      // sebelumnya mode manual aktif TANPA handover. Akibatnya tombol
      // "Tandai Selesai" tidak muncul di inbox. Buat jejak handover bila
      // belum ada agar percakapan selalu punya jalan penyelesaian.
      const [aktif] = await db
        .select({ id: beregamHandovers.id })
        .from(beregamHandovers)
        .where(
          and(
            eq(beregamHandovers.contactId, contact.id),
            inArray(beregamHandovers.status, ["open", "claimed"])
          )
        )
        .limit(1);

      if (!aktif) {
        await db.insert(beregamHandovers).values({
          contactId: contact.id,
          channel: "wa",
          reason: "Ditangani langsung melalui WhatsApp",
          status: "claimed",
          claimedAt: sekarang,
        });
      }
    }

    console.info(
      `[beregam] balasan admin dari HP tercatat, kontak=${samarkanNomor(contact.phone)}`
    );
    return;
  }

  // --- Pesan masuk dari warga ----------------------------------------------
  const jenis = p.type ?? "text";
  const isiTeks = p.body ?? "";

  await service.catatPesan({
    contactId: contact.id,
    direction: "in",
    waMessageId: p.id,
    type: jenis,
    body: isiTeks || null,
    raw: data,
  });

  // Kontak yang diblokir: dicatat, tidak dibalas.
  if (contact.isBlocked) return;

  // -------------------------------------------------------------------------
  // PESAN BUKAN TEKS
  //
  // Warga pasti mengirim foto, voice note, dokumen, lokasi, dan stiker.
  // Media sengaja TIDAK diunduh ke Hostinger - kuota disk terbatas dan
  // isinya tidak dibutuhkan; metadatanya sudah tersimpan di kolom raw.
  // -------------------------------------------------------------------------
  if (jenis !== "text" && jenis !== "chat") {
    if (basi) return;

    // Voice note biasanya keluhan yang panjang dan sulit diketik. Langsung
    // diserahkan ke petugas, bukan dijawab "saya hanya bisa membaca teks".
    if (jenis === "ptt" || jenis === "audio") {
      await service.escalate(contact, "Mengirim pesan suara");
      return;
    }

    await service.balasBukanTeks(contact, jenis);
    return;
  }

  await service.handleIncoming(contact, isiTeks, { stale: basi });
}
