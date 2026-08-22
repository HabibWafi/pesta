import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamOutbox, type BeregamOutbox } from "../db/schema";
import { tambahDetik } from "@/lib/waktu";
import type { BeregamGateway, OpsiKirim } from "./gateway";

/**
 * Driver OpenWA.
 *
 * PENTING - driver ini TIDAK memanggil OpenWA sama sekali.
 *
 * PESTA berjalan di Hostinger dan tidak bisa menjangkau PC kantor: PC itu
 * berada di balik NAT tanpa IP publik, dan engine-nya sengaja hanya terikat
 * ke 127.0.0.1. Membalik arah lalu lintas justru yang menghilangkan
 * kebutuhan tunnel, port forwarding, dan DDNS - sekaligus menghapus
 * permukaan serangannya.
 *
 * Jadi tugas driver ini hanya satu: MENULIS SATU BARIS ke beregam_outbox.
 * Worker di PC yang datang mengambil dan mengirimkannya.
 */
export class OpenWaDriver implements BeregamGateway {
  name(): string {
    return "openwa";
  }

  async queueText(
    contactId: number,
    waId: string,
    text: string,
    opts: OpsiKirim = {}
  ): Promise<BeregamOutbox> {
    // `source` disisipkan ke payload supaya bisa ditelusuri sampai ke
    // beregam_messages saat worker mengonfirmasi pengiriman (lihat
    // /api/beregam/outbox/[id]/ack) - itulah yang membedakan balasan bot,
    // FAQ, dan petugas di inbox percakapan admin.
    return this.antre(contactId, waId, "text", { text, source: opts.source ?? null }, opts);
  }

  async queueMenu(
    contactId: number,
    waId: string,
    header: string,
    items: string[],
    opts: OpsiKirim = {}
  ): Promise<BeregamOutbox> {
    // Menu dikirim sebagai teks biasa berisi daftar bernomor. Tombol
    // interaktif WhatsApp tidak dipakai: dukungannya berbeda-beda antar
    // versi aplikasi, dan angka yang diketik selalu bisa dibaca semua orang.
    const teks = [header, "", ...items].join("\n");
    return this.antre(
      contactId,
      waId,
      "menu",
      { text: teks, header, items, source: opts.source ?? null },
      opts
    );
  }

  private async antre(
    contactId: number,
    waId: string,
    type: string,
    payload: Record<string, unknown>,
    opts: OpsiKirim
  ): Promise<BeregamOutbox> {
    // TIDAK memakai jedaAcakDetik() sebagai bawaan.
    //
    // Sempat begitu, dan efeknya dobel: baris ini menunda kapan pesan
    // BOLEH diambil worker (scheduledAt), lalu worker sendiri menunda LAGI
    // sebelum benar-benar mengirim - sendSeen, "sedang mengetik", baru
    // sendText (lihat worker/src/index.ts). Jeda pertama tidak menunjukkan
    // indikator apa pun ke warga; ia cuma waktu kosong yang menambah beban
    // di atas jeda kedua yang sudah meniru manusia mengetik.
    //
    // Bawaan sekarang 0 - pesan langsung boleh diambil worker begitu
    // tersimpan. Jeda "terasa manusiawi" tetap utuh, dikerjakan worker.
    // `delaySeconds` tetap ada untuk kebutuhan berbeda: MENGURUTKAN dua
    // pesan berturut-turut (lihat jawabMenu di beregam-service.ts, yang
    // sengaja memberi delaySeconds=4 pada pesan kedua).
    const jeda = opts.delaySeconds ?? 0;

    const [dibuat] = await db
      .insert(beregamOutbox)
      .values({
        contactId,
        waId,
        type,
        payload,
        status: "pending",
        scheduledAt: tambahDetik(jeda),
        sentBy: opts.sentBy ?? null,
      })
      .$returningId();

    const [baris] = await db
      .select()
      .from(beregamOutbox)
      .where(eq(beregamOutbox.id, dibuat.id))
      .limit(1);

    return baris;
  }
}
