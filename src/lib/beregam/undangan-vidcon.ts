import { findOrCreateContactByWaId } from "./db/queries";
import { getGateway } from "./drivers";
import { keNomorWa } from "./nomor";
import { ambilPengaturan } from "@/lib/content/settings";
import { samarkanNomor } from "@/lib/waktu";
import type { VidconRequest } from "@/lib/db/schema";

/**
 * Mengirim undangan ViDCon ke WhatsApp pemohon.
 *
 * Sebelumnya petugas hanya mengubah status jadi "DISETUJUI" lalu harus
 * menyalin sendiri jadwal, topik, dan tautan Zoom ke WhatsApp warga satu per
 * satu. Itu pekerjaan yang mudah salah ketik dan mudah terlupakan - dan
 * warga baru sadar undangannya tidak pernah datang saat jam konsultasi
 * sudah lewat.
 *
 * Seluruh isinya diambil dari permohonan yang sudah diisi warga sendiri,
 * jadi tidak ada yang perlu diketik ulang.
 *
 * PESTA tidak pernah mengirim WhatsApp sendiri: yang terjadi di sini hanya
 * menulis baris ke beregam_outbox, lalu worker di PC kantor yang benar-benar
 * mengirimkannya.
 */

/** Tanggal "2026-08-26" -> "Rabu, 26 Agustus 2026". Dikembalikan apa adanya bila tidak terbaca. */
export function tanggalPanjang(iso: string): string {
  const d = new Date(`${iso}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

/**
 * Menyusun teks undangan dari naskah yang bisa disunting petugas.
 *
 * Dipisah dari pengirimannya supaya panel admin bisa menampilkan
 * PRATINJAU persis seperti yang akan diterima warga. Petugas melihat dulu
 * apa yang dikirim atas namanya, bukan menekan tombol lalu berharap.
 */
export function susunUndangan(
  v: Pick<VidconRequest, "id" | "nama" | "asalInstansi" | "tanggal" | "jam" | "cakupan">,
  naskah: string,
  zoom: string
): string {
  return naskah
    .replaceAll("{nama}", v.nama)
    .replaceAll("{instansi}", v.asalInstansi ?? "-")
    .replaceAll("{tanggal}", tanggalPanjang(v.tanggal))
    .replaceAll("{jam}", v.jam)
    .replaceAll("{topik}", v.cakupan)
    .replaceAll("{zoom}", zoom)
    .replaceAll("{tiket}", String(v.id));
}

export type HasilUndangan =
  | { ok: true; nomorWa: string; pesan: string }
  | { ok: false; alasan: string };

/**
 * Menyiapkan undangan: memeriksa nomor dan menyusun teksnya, TANPA mengirim.
 *
 * Dipakai pratinjau di panel admin, dan dipakai ulang saat benar-benar
 * mengirim - supaya yang dilihat petugas dijamin sama dengan yang dikirim,
 * bukan dua jalur berbeda yang bisa menyimpang diam-diam.
 */
export async function siapkanUndangan(v: VidconRequest): Promise<HasilUndangan> {
  const nomor = keNomorWa(v.noHp);
  if (!nomor.ok) {
    return {
      ok: false,
      alasan: `Nomor WhatsApp pemohon tidak bisa dipakai - ${nomor.alasan}. Hubungi warga lewat email (${v.email}) atau perbaiki nomornya lebih dulu.`,
    };
  }

  const pengaturan = await ambilPengaturan();
  const zoom = pengaturan["vidcon.zoom"] ?? "";
  const naskah = pengaturan["vidcon.undangan"] ?? "";

  if (!naskah.trim()) {
    return { ok: false, alasan: "Naskah undangan kosong. Isi di Kelola Konten > ViDCon." };
  }
  if (!zoom.trim()) {
    return { ok: false, alasan: "Tautan Zoom belum diisi. Isi di Kelola Konten > ViDCon." };
  }

  return { ok: true, nomorWa: nomor.wa, pesan: susunUndangan(v, naskah, zoom) };
}

/**
 * Benar-benar mengantrekan undangannya.
 *
 * Melempar galat bila gagal - SENGAJA. Status permohonan hanya boleh
 * berubah jadi "disetujui" kalau undangannya benar-benar masuk antrean;
 * kalau tidak, petugas akan mengira warga sudah diundang padahal belum,
 * dan tidak ada yang menyusul sampai hari-H.
 */
export async function kirimUndangan(nomorWa: string, pesan: string): Promise<void> {
  const kontak = await findOrCreateContactByWaId(`${nomorWa}@c.us`, null, nomorWa);
  await getGateway().queueText(kontak.id, kontak.waId, pesan, { source: "bot" });
  console.info(`[vidcon] undangan diantrekan untuk kontak=${samarkanNomor(nomorWa)}`);
}
