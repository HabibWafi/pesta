import type { BeregamOutbox, SumberPesan } from "../db/schema";

/**
 * Antarmuka gateway WhatsApp.
 *
 * Nilainya baru benar-benar terasa saat migrasi ke Meta Cloud API nanti:
 * yang berubah cukup satu berkas driver, sementara BeregamService, basis
 * pengetahuan, tabel indikator, inbox, dan admin panel tetap utuh.
 *
 * Biayanya sekarang hanya satu berkas - itu sebabnya dibuat sejak awal,
 * bukan nanti saat migrasinya sudah di depan mata.
 */

export interface OpsiKirim {
  /** Jeda sebelum dikirim, dalam detik. Bagian dari aturan anti-blokir. */
  delaySeconds?: number;
  /** Id petugas, bila ini balasan manusia. */
  sentBy?: number;
  /** Asal balasan, untuk jejak audit dan metrik per fase. */
  source?: SumberPesan;
  /** Teks antarmuka List Message; kosong berarti memakai label menu utama. */
  interactive?: {
    title: string;
    button: string;
    sectionTitle: string;
    footer?: string;
    /** Isi yang tampil di kartu List Message; fallback teks tetap memakai menu lengkap. */
    description?: string;
  };
}

export interface BeregamGateway {
  /** Mengantre satu pesan teks. */
  queueText(
    contactId: number,
    waId: string,
    text: string,
    opts?: OpsiKirim
  ): Promise<BeregamOutbox>;

  /** Mengantre List Message interaktif dengan menu teks sebagai fallback. */
  queueMenu(
    contactId: number,
    waId: string,
    header: string,
    items: string[],
    opts?: OpsiKirim
  ): Promise<BeregamOutbox>;

  /** Nama driver, untuk log dan dashboard. */
  name(): string;
}
