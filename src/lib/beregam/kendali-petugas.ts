import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { beregamContacts, beregamHandovers, type BeregamContact } from "./db/schema";
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
