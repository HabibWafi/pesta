import type { BeregamOutbox } from "../db/schema";
import type { BeregamGateway, OpsiKirim } from "./gateway";

/**
 * Driver Meta Cloud API - STUB, sengaja belum diimplementasikan.
 *
 * Ini penanda arsitektur, bukan kode mati. Keberadaannya memaksa
 * BeregamService bicara lewat antarmuka BeregamGateway sejak hari pertama,
 * sehingga saat migrasi benar-benar dilakukan nanti, yang berubah hanya
 * berkas ini.
 *
 * Jalur migrasinya:
 *   Tahap 1 (sekarang)  PC kantor + OpenWA          Rp0/bulan
 *   Tahap 2 (opsional)  VPS + engine yang sama      ganti 1 URL di worker
 *   Tahap 3 (panjang)   Meta Cloud API resmi        implementasikan berkas ini
 *
 * Catatan biaya untuk Tahap 3: mulai 1 Oktober 2026, pesan layanan di dalam
 * jendela 24 jam Meta tidak lagi gratis. Hitung ulang berdasarkan volume
 * nyata dari metrik dashboard saat itu.
 */

const BELUM_SIAP =
  "CloudApiDriver belum diimplementasikan. Ini penanda arsitektur untuk " +
  "migrasi ke Meta Cloud API. Lihat docs/beregam/MIGRASI-CLOUD-API.md " +
  "sebelum mengaktifkannya, dan siapkan verifikasi bisnis Meta untuk " +
  "instansi pemerintah lebih dulu.";

export class CloudApiDriver implements BeregamGateway {
  name(): string {
    return "cloud-api";
  }

  async queueText(
    _contactId: number,
    _waId: string,
    _text: string,
    _opts?: OpsiKirim
  ): Promise<BeregamOutbox> {
    throw new Error(BELUM_SIAP);
  }

  async queueMenu(
    _contactId: number,
    _waId: string,
    _header: string,
    _items: string[],
    _opts?: OpsiKirim
  ): Promise<BeregamOutbox> {
    throw new Error(BELUM_SIAP);
  }
}
