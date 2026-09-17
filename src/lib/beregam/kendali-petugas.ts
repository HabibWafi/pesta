import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  beregamContacts,
  beregamHandovers,
  beregamSessions,
  type BeregamContact,
} from "./db/schema";
import { ambilAtauBuatSesi } from "./db/queries";
import { getGateway } from "./drivers";
import { ambilPesan } from "./pesan";

export interface HandoverAktifPetugas {
  id: number;
  contactId: number;
  nama: string | null;
  nomor: string;
  alasan: string;
}

/** Maksimal baris yang aman ditampilkan dalam satu List Message WhatsApp. */
const BATAS_DAFTAR = 10;

export interface HasilTahanBotUntukPetugas {
  handoverId: number;
  dibuatBaru: boolean;
}

/**
 * Menahan bot begitu petugas mengirim pesan kepada warga.
 *
 * Fungsi ini sengaja dipakai bersama oleh webhook pesan dari HP dan balasan
 * dari panel admin. Pesan petugas boleh menjadi pesan PERTAMA dalam sebuah
 * percakapan; karena itu sesi harus dibuat di sini, bukan diasumsikan sudah
 * ada akibat pesan masuk sebelumnya.
 */
export async function tahanBotUntukPetugas(
  contactId: number,
  alasan: string,
  assignedTo?: number
): Promise<HasilTahanBotUntukPetugas> {
  const sesi = await ambilAtauBuatSesi(contactId);
  const sekarang = new Date();

  await db
    .update(beregamSessions)
    .set({
      mode: "manual",
      state: "manual",
      lastActivityAt: sekarang,
    })
    .where(eq(beregamSessions.id, sesi.id));

  const [aktif] = await db
    .select({ id: beregamHandovers.id })
    .from(beregamHandovers)
    .where(
      and(
        eq(beregamHandovers.contactId, contactId),
        inArray(beregamHandovers.status, ["open", "claimed"])
      )
    )
    .orderBy(desc(beregamHandovers.id))
    .limit(1);

  if (aktif) {
    await db
      .update(beregamHandovers)
      .set({
        status: "claimed",
        claimedAt: sekarang,
        ...(assignedTo !== undefined ? { assignedTo } : {}),
      })
      .where(eq(beregamHandovers.id, aktif.id));

    return { handoverId: aktif.id, dibuatBaru: false };
  }

  const [dibuat] = await db
    .insert(beregamHandovers)
    .values({
      contactId,
      channel: "wa",
      reason: alasan.slice(0, 150),
      status: "claimed",
      assignedTo: assignedTo ?? null,
      claimedAt: sekarang,
    })
    .$returningId();

  return { handoverId: dibuat.id, dibuatBaru: true };
}

export async function ambilHandoverAktifPetugas(): Promise<HandoverAktifPetugas[]> {
  return db
    .select({
      id: beregamHandovers.id,
      contactId: beregamHandovers.contactId,
      nama: beregamContacts.name,
      nomor: beregamContacts.phone,
      alasan: beregamHandovers.reason,
    })
    .from(beregamHandovers)
    .innerJoin(beregamContacts, eq(beregamContacts.id, beregamHandovers.contactId))
    .where(inArray(beregamHandovers.status, ["open", "claimed"]))
    .orderBy(desc(beregamHandovers.id))
    .limit(BATAS_DAFTAR);
}

/** Identitas yang cukup jelas untuk konfirmasi petugas, tanpa menebak kontak. */
export function identitasHandover(h: HandoverAktifPetugas): string {
  const nama = h.nama?.replace(/\s+/g, " ").trim();
  const nomor = h.nomor ? `+${h.nomor}` : "nomor tidak terbaca";
  return nama ? `${nama} (${nomor})` : nomor;
}

/**
 * Mengirim daftar kendali ke nomor petugas dalam bentuk List Message.
 *
 * ID handover ditempatkan di awal judul baris. NOWEB mengirim judul baris
 * tersebut kembali sebagai isi pesan ketika dipilih, sehingga server dapat
 * menutup ID yang tepat walaupun ada banyak layanan aktif bersamaan.
 */
export async function kirimDaftarKendaliPetugas(
  staf: BeregamContact,
  pengantar: string
): Promise<number> {
  const daftar = await ambilHandoverAktifPetugas();

  if (daftar.length === 0) {
    await getGateway().queueText(
      staf.id,
      staf.waId,
      `${pengantar}\n\n${await ambilPesan("petugas_tanpa_layanan")}`,
      { source: "bot" }
    );
    return 0;
  }

  const [judul, tombol, bagian, petunjuk] = await Promise.all([
    ambilPesan("petugas_kendali_judul"),
    ambilPesan("petugas_kendali_tombol"),
    ambilPesan("petugas_kendali_bagian"),
    ambilPesan("petugas_kendali_petunjuk"),
  ]);

  await getGateway().queueMenu(
    staf.id,
    staf.waId,
    pengantar,
    [
      ...daftar.map((h) => `${h.id}. ${identitasHandover(h)}`),
      "",
      petunjuk,
    ],
    {
      source: "bot",
      interactive: {
        title: judul,
        button: tombol,
        sectionTitle: bagian,
        footer: "Beregam • BPS Kabupaten Musi Rawas",
        description: pengantar,
      },
    }
  );

  return daftar.length;
}
