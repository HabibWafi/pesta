import { findOrCreateContactByWaId } from "./db/queries";
import { getGateway } from "./drivers";
import { getConfig } from "./config";
import { formatWib, samarkanNomor } from "@/lib/waktu";

/**
 * Notifikasi WhatsApp ke petugas piket.
 *
 * Nomor petugas (BEREGAM_STAFF_WA) sengaja BERBEDA dari nomor bot. Pesan di
 * sini murni pemberitahuan "ada yang perlu ditindaklanjuti"; petugas tetap
 * melayani warga lewat panel PESTA atau lewat WhatsApp Beregam, bukan
 * membalas dari nomor penerima notifikasi ini.
 *
 * Dipakai dua tempat yang berbeda sifatnya, dan itu disengaja:
 *
 *   - BeregamService, saat warga minta bicara dengan petugas
 *   - Route API layanan, saat permohonan baru masuk - baik dari formulir web
 *     maupun dari bot WhatsApp
 *
 * Keduanya memakai jalur yang sama persis: menulis baris ke beregam_outbox,
 * lalu worker di PC kantor yang mengirimkannya. PESTA tidak pernah mengirim
 * WhatsApp sendiri.
 */

/**
 * Mengantre satu pesan ke WhatsApp petugas.
 *
 * TIDAK PERNAH melempar galat. Notifikasi adalah lapisan tambahan; kegagalan
 * mengirimnya tidak boleh sampai menggagalkan penyimpanan permohonan warga
 * yang sudah berhasil masuk database. Pemanggil boleh memakainya tanpa
 * membungkusnya lagi.
 */
export async function kirimNotifikasiPetugas(teks: string): Promise<void> {
  try {
    const nomor = getConfig().staffWaNumber;
    if (!nomor) {
      console.warn("[beregam] BEREGAM_STAFF_WA belum diisi - notifikasi petugas dilewati");
      return;
    }

    const staf = await findOrCreateContactByWaId(`${nomor}@c.us`, "Petugas PST (notifikasi)");
    await getGateway().queueText(staf.id, staf.waId, teks, { source: "bot" });
  } catch (error) {
    // Termasuk kasus modul Beregam belum dikonfigurasi sama sekali di server
    // ini - getConfig() akan melempar, dan formulir web tetap harus jalan.
    console.error("[beregam] gagal mengirim notifikasi ke petugas:", error);
  }
}

export type JenisPermohonan = "vidcon" | "pengaduan" | "data";

const JUDUL: Record<JenisPermohonan, string> = {
  vidcon: "💬 *Permohonan ViDCon baru*",
  pengaduan: "📮 *Aduan / saran baru*",
  data: "🗂️ *Permintaan data baru*",
};

const HALAMAN_ADMIN: Record<JenisPermohonan, string> = {
  vidcon: "/admin/vidcon",
  pengaduan: "/admin/pengaduan",
  data: "/admin/permintaan-data",
};

export interface RincianPermohonan {
  jenis: JenisPermohonan;
  /** Nomor tiket = id baris di tabelnya. */
  id: number;
  nama: string;
  /** WEB | WHATSAPP - membantu petugas tahu warga bisa dibalas lewat mana. */
  sumber: string;
  /** Baris rincian singkat, mis. ["Topik: PDRB", "Jadwal: 2026-09-01 09:00"]. */
  baris: string[];
  /** Kontak yang bisa dihubungi, ditampilkan utuh - ini WhatsApp petugas, bukan berkas log. */
  kontak?: string | null;
}

/**
 * Menyusun teks notifikasi permohonan baru.
 *
 * Sengaja RINGKAS dan selalu mengarahkan ke panel PESTA. Menyalin seluruh isi
 * permohonan ke WhatsApp petugas terlihat praktis, tapi membuat data warga
 * tersebar ke perangkat pribadi dan mendorong petugas menindaklanjuti dari
 * chat - padahal status, catatan, dan riwayatnya hanya tercatat kalau
 * dikerjakan lewat panel.
 */
export function teksPermohonanBaru(r: RincianPermohonan): string {
  const baris = r.baris.filter(Boolean).map((b) => `• ${b}`).join("\n");
  const asal = r.sumber === "WHATSAPP" ? "WhatsApp Beregam" : "Formulir web PESTA";

  return (
    `${JUDUL[r.jenis]} (tiket #${r.id})\n\n` +
    `Nama: ${r.nama}\n` +
    (r.kontak ? `Kontak: ${r.kontak}\n` : "") +
    `Masuk lewat: ${asal}\n` +
    `Waktu: ${formatWib(new Date())} WIB\n\n` +
    (baris ? `${baris}\n\n` : "") +
    `Tindak lanjuti di panel PESTA:\nhttps://bpskabmusirawas.com${HALAMAN_ADMIN[r.jenis]}`
  );
}

/**
 * Jalan pintas: susun lalu kirim. Aman dipanggil tanpa await sekalipun -
 * galatnya sudah ditangani di dalam.
 */
export async function beritahuPermohonanBaru(r: RincianPermohonan): Promise<void> {
  await kirimNotifikasiPetugas(teksPermohonanBaru(r));
  console.info(
    `[beregam] notifikasi permohonan ${r.jenis} #${r.id} (${r.sumber}) diantrekan` +
      (r.kontak ? ` untuk kontak=${samarkanNomor(r.kontak.replace(/[^0-9]/g, ""))}` : "")
  );
}
