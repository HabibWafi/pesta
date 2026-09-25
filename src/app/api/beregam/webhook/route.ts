import { NextResponse } from "next/server";
import {
  adaOutboxTerkunciUntukKontak,
  findOrCreateContactByWaId,
  pesanSudahAda,
} from "@/lib/beregam/db/queries";
import { webhookSah, HEADER_WEBHOOK_HMAC } from "@/lib/beregam/auth";
import { webhookPayloadSchema } from "@/lib/beregam/contracts";
import { namaProfil, nomorAsli } from "@/lib/beregam/identitas";
import { getConfig } from "@/lib/beregam/config";
import { getBeregamService } from "@/lib/beregam/services/beregam-service";
import { tahanBotUntukPetugas } from "@/lib/beregam/kendali-petugas";
import { kirimNotifikasiPetugas } from "@/lib/beregam/notifikasi";
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
  // `message` hanya memuat pesan masuk. Pesan yang dikirim manual dari HP
  // pemegang nomor Beregam muncul sebagai `message.any` dengan fromMe=true.
  // Terima keduanya selama masa transisi konfigurasi WAHA; deduplikasi ID di
  // bawah mencegah pesan masuk diproses dua kali bila keduanya terlangganan.
  if (data.event && !["message", "message.any"].includes(data.event)) {
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
  const kanalPetugas = service.adalahPetugasNotifikasi(contact);

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
    // Pesan yang dikirim worker juga muncul sebagai `message.any` fromMe.
    // Event itu dapat mendahului ACK worker, jadi deduplikasi waMessageId di
    // atas belum tentu sudah melihatnya. Jangan salah menganggap kiriman bot
    // sebagai percakapan manual lalu mengunci sesi warga ke mode manual.
    //
    // Nomor petugas selalu kanal notifikasi/kendali, bukan warga yang sedang
    // diajak bicara manual dari HP bot.
    if (kanalPetugas || (await adaOutboxTerkunciUntukKontak(contact.id))) {
      console.info(
        `[beregam] event pesan keluar sistem diabaikan, kontak=${samarkanNomor(contact.phone)}`
      );
      return;
    }

    await service.catatPesan({
      contactId: contact.id,
      direction: "out",
      waMessageId: p.id,
      type: p.type ?? "text",
      body: p.body ?? null,
      source: "agent_phone",
      raw: data,
    });

    // Pesan petugas dapat menjadi pesan PERTAMA kepada nomor yang belum
    // pernah menghubungi Beregam. Tetap buat sesi + handover dan tahan bot;
    // balasan warga berikutnya harus masuk ke petugas, bukan dijawab menu.
    const tahan = await tahanBotUntukPetugas(
      contact.id,
      "Percakapan dimulai petugas melalui WhatsApp Beregam"
    );

    // Hanya handover baru yang perlu diberitahukan. Pesan manual berikutnya
    // dalam percakapan yang sama tidak boleh membanjiri WA petugas piket.
    if (tahan.dibuatBaru) {
      const identitas = contact.name?.trim()
        ? `${contact.name.trim()} (${contact.phone ? `+${contact.phone}` : "nomor tidak terbaca"})`
        : contact.phone
          ? `+${contact.phone}`
          : "kontak tanpa nomor terbaca";
      await kirimNotifikasiPetugas(
        `🟡 *Percakapan manual dimulai*\n\n` +
          `Kontak: ${identitas}\n` +
          `Layanan #${tahan.handoverId}\n\n` +
          "Bot ditahan untuk kontak ini sampai layanan ditandai selesai.",
        { kendaliHandover: true }
      );
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

  // Kanal petugas harus mendahului pemeriksaan tipe pesan. Pilihan List
  // Message dari NOWEB memakai tipe `listResponseMessage`, bukan text/chat,
  // tetapi body-nya tetap berisi judul baris seperti "123. Nama Pengguna".
  // Jika dibiarkan masuk cabang media, pilihan penyelesaian dianggap chat
  // warga baru dan bot mengirim jawaban yang salah.
  if (kanalPetugas) {
    await service.handleIncoming(contact, isiTeks, { stale: basi });
    return;
  }

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
