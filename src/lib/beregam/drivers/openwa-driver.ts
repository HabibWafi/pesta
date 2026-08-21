import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamOutbox, type BeregamOutbox } from "../db/schema";
import { tambahDetik } from "@/lib/waktu";
import { jedaAcakDetik } from "../config";
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
    return this.antre(contactId, waId, "text", { text }, opts);
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
    return this.antre(contactId, waId, "menu", { text: teks, header, items }, opts);
  }

  private async antre(
    contactId: number,
    waId: string,
    type: string,
    payload: Record<string, unknown>,
    opts: OpsiKirim
  ): Promise<BeregamOutbox> {
    // Jeda acak dihitung di sini supaya seluruh sistem memakai aturan yang
    // sama, dan worker tidak perlu tahu kebijakannya.
    const jeda = opts.delaySeconds ?? jedaAcakDetik();

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
