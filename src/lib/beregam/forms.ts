import * as z from "zod";
import { db } from "@/lib/db";
import { pengaduans, permintaanData, vidconRequests } from "@/lib/db/schema";
import { vidconSchema } from "@/lib/schemas/vidcon";
import { aduanSchema } from "@/lib/schemas/aduan";
import { permintaanDataSchema } from "@/lib/schemas/permintaan-data";
import { komponenWib } from "@/lib/waktu";
import { getConfig } from "./config";
import type { BeregamContact } from "./db/schema";

/**
 * Formulir layanan yang bisa diisi langsung di percakapan WhatsApp.
 *
 * Sebelumnya menu 2 (permintaan data), 3 (ViDCon), dan 7 (pengaduan) hanya
 * membalas dengan tautan ke web PESTA - warga harus pindah aplikasi untuk
 * benar-benar mengajukan. Sekarang isiannya dikumpulkan langkah demi
 * langkah di sini, lalu masuk ke TABEL YANG SAMA PERSIS dengan formulir
 * web (vidcon_requests, pengaduans, permintaan_data) - satu antrean kerja
 * bagi petugas, bukan dua yang terpisah.
 *
 * Validasi akhir sebelum simpan SELALU lewat skema Zod yang sama dengan
 * formulir web (src/lib/schemas/*) - satu sumber kebenaran aturan, berlaku
 * untuk kanal mana pun. Validasi per-langkah di berkas ini hanyalah
 * pemeriksaan dini supaya warga tahu lebih cepat kalau isiannya kurang pas,
 * bukan pengganti skema itu.
 */

export type JenisForm = "vidcon" | "pengaduan" | "data";

export interface HasilLangkah {
  ok: boolean;
  nilai?: string;
  pesan?: string;
}

export interface LangkahForm {
  field: string;
  /** Boleh dilewati dengan salah satu KATA_LEWATI - dicek oleh mesinnya, bukan di sini. */
  opsional?: boolean;
  pertanyaan: (jawaban: Record<string, string>, contact: BeregamContact) => string;
  proses: (
    input: string,
    bersih: string,
    contact: BeregamContact
  ) => { ok: true; nilai: string } | { ok: false; pesan: string };
}

/** Kata yang menandakan warga melewati satu isian opsional. Dipakai juga oleh alur penilaian. */
export const KATA_LEWATI = ["lewati", "skip", "nanti", "tidak", "gak", "engga", "enggak"];

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Menyusun teks jam layanan dari konfigurasi, bukan ditulis tetap di banyak tempat. */
export function deskripsiJamLayanan(): string {
  const { hariKerja, jamBuka, jamTutup } = getConfig().jamLayanan;
  const urut = [...hariKerja].sort((a, b) => a - b);
  const berurutan =
    urut.length > 1 && urut.every((h, i) => i === 0 || h === urut[i - 1] + 1);
  const hari = berurutan
    ? `${NAMA_HARI[urut[0]]}-${NAMA_HARI[urut[urut.length - 1]]}`
    : urut.map((h) => NAMA_HARI[h]).join(", ");
  const jam = (j: number) => `${String(j).padStart(2, "0")}.00`;
  return `${hari}, ${jam(jamBuka)}-${jam(jamTutup)} WIB`;
}

// ---------------------------------------------------------------------------
// Validator per-langkah, dipakai ulang lintas formulir
// ---------------------------------------------------------------------------

function teksMin(input: string, min: number, pesan: string): HasilLangkah & { ok: true; nilai: string } | { ok: false; pesan: string } {
  const bersih = input.trim();
  if (bersih.length < min) return { ok: false, pesan };
  return { ok: true, nilai: bersih };
}

function validasiEmail(input: string) {
  const hasil = z.string().trim().toLowerCase().email().safeParse(input);
  return hasil.success
    ? ({ ok: true, nilai: hasil.data } as const)
    : ({ ok: false, pesan: "Format email belum tepat. Contoh: nama@email.com. Coba ketik lagi." } as const);
}

function validasiNoHp(input: string, bersih: string, contact: BeregamContact) {
  if (["sama", "ya", "iya", "sama saja", "pakai ini"].includes(bersih)) {
    return { ok: true, nilai: contact.phone } as const;
  }
  const digitSaja = input.replace(/[^0-9]/g, "");
  if (digitSaja.length < 6) {
    return {
      ok: false,
      pesan:
        "Nomor HP/WA belum valid. Ketik *sama* untuk pakai nomor WhatsApp ini, atau ketik ulang nomornya.",
    } as const;
  }
  return { ok: true, nilai: input.trim() } as const;
}

const NAMA_BULAN: Record<string, string> = {
  januari: "01", februari: "02", maret: "03", april: "04",
  mei: "05", juni: "06", juli: "07", agustus: "08",
  september: "09", oktober: "10", november: "11", desember: "12",
};

function selesaikanTanggal(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  const invalid = Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso;
  if (invalid) {
    return { ok: false, pesan: "Tanggal tidak valid. Contoh: 25-08-2026." } as const;
  }
  if (iso < komponenWib().tanggalIso) {
    return {
      ok: false,
      pesan: "Tanggalnya sudah lewat. Pilih tanggal hari ini atau setelahnya.",
    } as const;
  }
  return { ok: true, nilai: iso } as const;
}

function validasiTanggal(input: string) {
  const bersih = input.trim().toLowerCase();

  const namaBulan = bersih.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (namaBulan) {
    const [, tgl, bulanTeks, tahun] = namaBulan;
    const bulan = NAMA_BULAN[bulanTeks];
    if (bulan) return selesaikanTanggal(`${tahun}-${bulan}-${tgl.padStart(2, "0")}`);
  }

  const numerik = bersih.match(/^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/);
  if (numerik) {
    const [, a, b, c] = numerik;
    const iso =
      a.length === 4
        ? `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`
        : `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    return selesaikanTanggal(iso);
  }

  return { ok: false, pesan: "Format tanggal belum dikenali. Contoh: 25-08-2026." } as const;
}

function validasiJam(input: string) {
  const bersih = input.trim().replace(",", ".");
  const cocok = bersih.match(/^(\d{1,2})[:.](\d{2})$/) ?? bersih.match(/^(\d{1,2})$/);
  if (!cocok) {
    return { ok: false, pesan: "Format jam belum dikenali. Contoh: 09:00." } as const;
  }
  const jam = Number(cocok[1]);
  const menit = cocok[2] ? Number(cocok[2]) : 0;
  if (jam < 0 || jam > 23 || menit < 0 || menit > 59) {
    return { ok: false, pesan: "Jam tidak valid. Contoh: 09:00." } as const;
  }
  return { ok: true, nilai: `${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}` } as const;
}

const KATEGORI_ADUAN = [
  { nilai: "Pelayanan PST", label: "Pelayanan Statistik Terpadu (PST)" },
  { nilai: "Layanan ViDCon", label: "Layanan ViDCon Online" },
  { nilai: "Publikasi & Data", label: "Kualitas Data & Publikasi" },
  { nilai: "Sarana & Prasarana", label: "Fasilitas / Sarana Prasarana" },
  { nilai: "Lainnya", label: "Pengaduan Lainnya" },
] as const;

function pertanyaanKategori(): string {
  const baris = KATEGORI_ADUAN.map((k, i) => `${i + 1}. ${k.label}`).join("\n");
  return `Kategori aduan/saran Anda? Balas dengan *angka*:\n\n${baris}`;
}

function validasiKategori(bersih: string) {
  const idx = Number(bersih) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= KATEGORI_ADUAN.length) {
    return {
      ok: false,
      pesan: `Balas dengan angka 1-${KATEGORI_ADUAN.length} sesuai daftar kategori di atas.`,
    } as const;
  }
  return { ok: true, nilai: KATEGORI_ADUAN[idx].nilai } as const;
}

function validasiJenisKelamin(bersih: string) {
  if (["l", "laki", "laki-laki", "pria"].includes(bersih)) {
    return { ok: true, nilai: "Laki-laki" } as const;
  }
  if (["p", "perempuan", "wanita"].includes(bersih)) {
    return { ok: true, nilai: "Perempuan" } as const;
  }
  return {
    ok: false,
    pesan: "Balas *L* untuk Laki-laki, *P* untuk Perempuan, atau *lewati*.",
  } as const;
}

function pertanyaanFormatData(): string {
  return (
    "Format data yang diinginkan? Balas dengan *angka*:\n\n" +
    "1. Berkas digital (soft file)\n2. Cetak (hard copy)\n3. Datang langsung ke kantor"
  );
}

function validasiFormatData(bersih: string) {
  const peta: Record<string, string> = { "1": "SOFT_FILE", "2": "HARD_COPY", "3": "KUNJUNGAN_LANGSUNG" };
  const nilai = peta[bersih];
  if (!nilai) {
    return { ok: false, pesan: "Balas dengan angka 1, 2, atau 3 sesuai daftar di atas." } as const;
  }
  return { ok: true, nilai } as const;
}

// ---------------------------------------------------------------------------
// Langkah per formulir
// ---------------------------------------------------------------------------

export const FORM_STEPS: Record<JenisForm, LangkahForm[]> = {
  vidcon: [
    {
      field: "nama",
      pertanyaan: () => "Baik, siapa nama lengkap Anda?",
      proses: (i) => teksMin(i, 2, "Nama minimal 2 karakter. Coba ketik lagi ya."),
    },
    {
      field: "instansi",
      pertanyaan: () => "Dari instansi/lembaga mana? (Boleh tulis *Pribadi* bila perorangan.)",
      proses: (i) => teksMin(i, 2, "Mohon diisi minimal 2 karakter."),
    },
    {
      field: "alamat",
      pertanyaan: () => "Alamat lengkap Anda/instansi?",
      proses: (i) => teksMin(i, 3, "Alamat minimal 3 karakter."),
    },
    {
      field: "email",
      pertanyaan: () => "Alamat email aktif, untuk kami kirimkan tautan ViDCon-nya?",
      proses: (i) => validasiEmail(i),
    },
    {
      field: "noHp",
      pertanyaan: (_j, c) =>
        `Nomor HP/WA aktif untuk dihubungi? Ketik *sama* untuk pakai nomor WhatsApp ini (+${c.phone}).`,
      proses: (i, b, c) => validasiNoHp(i, b, c),
    },
    {
      field: "topik",
      pertanyaan: () =>
        "Topik yang ingin dikonsultasikan? Contoh: PDRB, Inflasi, Kependudukan, Metodologi Survei, ROMANTIK.",
      proses: (i) => teksMin(i, 2, "Sebutkan topiknya ya, minimal 2 karakter."),
    },
    {
      field: "deskripsi",
      pertanyaan: () => "Ceritakan singkat kebutuhan konsultasi Anda (minimal 10 karakter).",
      proses: (i) => teksMin(i, 10, "Uraiannya masih terlalu singkat, minimal 10 karakter."),
    },
    {
      field: "tanggal",
      pertanyaan: () =>
        `Tanggal yang diinginkan untuk konsultasi? Contoh: 25-08-2026.\nViDCon dilayani hari kerja (${deskripsiJamLayanan()}).`,
      proses: (i) => validasiTanggal(i),
    },
    {
      field: "jam",
      pertanyaan: () => "Jam berapa (WIB)? Contoh: 09:00.",
      proses: (i) => validasiJam(i),
    },
    {
      field: "layananInklusifCatatan",
      opsional: true,
      pertanyaan: () =>
        "Perlu pendampingan khusus (mis. juru bahasa isyarat, kursi roda, lansia)? " +
        "Jelaskan singkat, atau ketik *tidak* bila tidak perlu.",
      proses: (i) => teksMin(i, 1, "Jelaskan singkat kebutuhannya, atau ketik *tidak*."),
    },
  ],

  pengaduan: [
    {
      field: "nama",
      pertanyaan: () => "Baik, siapa nama Anda? (Boleh tulis *Anonim* bila tidak ingin disebutkan.)",
      proses: (i) => teksMin(i, 2, "Nama minimal 2 karakter, atau tulis *Anonim*."),
    },
    {
      field: "kategori",
      pertanyaan: () => pertanyaanKategori(),
      proses: (_i, b) => validasiKategori(b),
    },
    {
      field: "detail",
      pertanyaan: () => "Silakan tuliskan detail aduan atau saran Anda (minimal 15 karakter).",
      proses: (i) => teksMin(i, 15, "Uraiannya masih terlalu singkat, minimal 15 karakter."),
    },
    {
      field: "email",
      pertanyaan: () => "Email aktif untuk kami hubungi terkait tindak lanjutnya?",
      proses: (i) => validasiEmail(i),
    },
    {
      field: "noHp",
      opsional: true,
      pertanyaan: (_j, c) =>
        `Nomor HP/WA (opsional)? Ketik *sama* untuk pakai nomor WhatsApp ini (+${c.phone}), atau *lewati*.`,
      proses: (i, b, c) => validasiNoHp(i, b, c),
    },
    {
      field: "jenisKelamin",
      opsional: true,
      pertanyaan: () => "Jenis kelamin Anda (opsional)? Balas *L* untuk Laki-laki, *P* untuk Perempuan, atau *lewati*.",
      proses: (_i, b) => validasiJenisKelamin(b),
    },
    {
      field: "asalInstansi",
      opsional: true,
      pertanyaan: () => "Asal instansi/lembaga (opsional)? Ketik *lewati* bila tidak perlu.",
      proses: (i) => teksMin(i, 1, "Mohon diisi, atau ketik *lewati*."),
    },
  ],

  data: [
    {
      field: "nama",
      pertanyaan: () => "Baik, siapa nama lengkap Anda?",
      proses: (i) => teksMin(i, 2, "Nama minimal 2 karakter. Coba ketik lagi ya."),
    },
    {
      field: "instansi",
      pertanyaan: () => "Dari instansi/lembaga mana? (Boleh tulis *Pribadi* bila perorangan.)",
      proses: (i) => teksMin(i, 2, "Mohon diisi minimal 2 karakter."),
    },
    {
      field: "alamat",
      pertanyaan: () => "Alamat lengkap Anda/instansi?",
      proses: (i) => teksMin(i, 3, "Alamat minimal 3 karakter."),
    },
    {
      field: "email",
      pertanyaan: () => "Alamat email aktif untuk kami hubungi?",
      proses: (i) => validasiEmail(i),
    },
    {
      field: "noHp",
      pertanyaan: (_j, c) =>
        `Nomor HP/WA aktif? Ketik *sama* untuk pakai nomor WhatsApp ini (+${c.phone}).`,
      proses: (i, b, c) => validasiNoHp(i, b, c),
    },
    {
      field: "jenisData",
      pertanyaan: () =>
        "Data/tabel statistik apa yang Anda butuhkan? Contoh: Data PDRB per kecamatan 2023, jumlah penduduk per desa, data inflasi bulanan.",
      proses: (i) => teksMin(i, 3, "Sebutkan data yang dibutuhkan, minimal 3 karakter."),
    },
    {
      field: "keperluan",
      pertanyaan: () =>
        "Untuk keperluan apa data ini akan digunakan? Contoh: penelitian, dokumen perencanaan, tugas akhir.",
      proses: (i) => teksMin(i, 5, "Uraiannya masih terlalu singkat, minimal 5 karakter."),
    },
    {
      field: "formatDiinginkan",
      pertanyaan: () => pertanyaanFormatData(),
      proses: (_i, b) => validasiFormatData(b),
    },
    {
      field: "catatan",
      opsional: true,
      pertanyaan: () => "Ada catatan tambahan? Tulis pesan Anda, atau ketik *lewati*.",
      proses: (i) => teksMin(i, 1, "Tulis catatannya, atau ketik *lewati*."),
    },
  ],
};

/** Sapaan pembuka tiap formulir. Semuanya menyebut jalan keluar - tidak ada warga yang boleh merasa terjebak. */
export const FORM_INTRO_BAWAAN: Record<JenisForm, string> = {
  vidcon:
    "💬 Yuk, kita isi formulir ViDCon (konsultasi statistik) bersama. Beberapa pertanyaan " +
    "singkat, gratis. Ketik *batal* kapan saja untuk keluar.",
  pengaduan:
    "📮 Baik, saya bantu catat aduan/saran Anda. Beberapa pertanyaan singkat ya. " +
    "Ketik *batal* kapan saja untuk keluar.",
  data:
    "🗂️ Siap, kita ajukan permintaan data Anda ke petugas kami. Beberapa pertanyaan " +
    "singkat dulu ya. Ketik *batal* kapan saja untuk keluar.",
};

// ---------------------------------------------------------------------------
// Penyimpanan akhir
// ---------------------------------------------------------------------------

/**
 * Menyimpan jawaban yang sudah lengkap ke tabel yang sama dengan formulir web.
 *
 * Divalidasi ULANG lewat skema Zod domain masing-masing sebelum disimpan -
 * pemeriksaan per-langkah di atas hanya percepatan pengalaman warga, bukan
 * pengganti satu sumber kebenaran aturan bisnis. `.parse()` menerima
 * `unknown`, jadi memberi objek longgar di sini aman secara tipe; kalau
 * ada isian yang lolos validasi langkah tapi gagal di sini, errornya
 * dilempar ke pemanggil untuk ditangani sebagai kegagalan submit.
 */
export async function submitForm(
  jenis: JenisForm,
  jawaban: Record<string, string>
): Promise<{ id: number; pesan: string }> {
  if (jenis === "vidcon") {
    const data = vidconSchema.parse({
      nama: jawaban.nama,
      instansi: jawaban.instansi,
      alamat: jawaban.alamat,
      noHp: jawaban.noHp,
      email: jawaban.email,
      topik: jawaban.topik,
      deskripsi: jawaban.deskripsi,
      tanggal: jawaban.tanggal,
      jam: jawaban.jam,
      layananInklusif: jawaban.layananInklusifCatatan ? ["LAINNYA"] : undefined,
      layananInklusifCatatan: jawaban.layananInklusifCatatan || undefined,
    });

    const [inserted] = await db
      .insert(vidconRequests)
      .values({
        nama: data.nama,
        asalInstansi: data.instansi,
        alamat: data.alamat,
        noHp: data.noHp,
        email: data.email,
        cakupan: data.topik,
        deskripsi: data.deskripsi,
        tanggal: data.tanggal,
        jam: data.jam,
        status: "PENDING",
        layananInklusif: data.layananInklusif ?? null,
        layananInklusifCatatan: data.layananInklusifCatatan || null,
        sumber: "WHATSAPP",
      })
      .$returningId();

    return {
      id: inserted.id,
      pesan:
        `✅ *Permohonan ViDCon Anda sudah kami terima!* (tiket #${inserted.id})\n\n` +
        `Topik: ${data.topik}\nJadwal diminta: ${data.tanggal} pukul ${data.jam} WIB\n\n` +
        "Petugas kami akan mengonfirmasi jadwal dan mengirim tautan pertemuan lewat " +
        "email/WhatsApp maksimal 1x24 jam pada hari kerja. Sampai jumpa! 😊",
    };
  }

  if (jenis === "pengaduan") {
    const data = aduanSchema.parse({
      nama: jawaban.nama,
      email: jawaban.email,
      noHp: jawaban.noHp || "",
      jenisKelamin: jawaban.jenisKelamin || "",
      asalInstansi: jawaban.asalInstansi || "",
      kategori: jawaban.kategori,
      detail: jawaban.detail,
    });

    const [inserted] = await db
      .insert(pengaduans)
      .values({
        nama: data.nama,
        email: data.email,
        noHp: data.noHp || null,
        jenisKelamin: data.jenisKelamin || null,
        asalInstansi: data.asalInstansi || null,
        kategori: data.kategori,
        detail: data.detail,
        status: "PENDING",
        sumber: "WHATSAPP",
      })
      .$returningId();

    return {
      id: inserted.id,
      pesan:
        `✅ *Aduan/saran Anda sudah kami terima* (tiket #${inserted.id}).\n\n` +
        "Staf Pengawas BPS Kabupaten Musi Rawas akan menindaklanjuti. Terima kasih atas " +
        "masukannya, sangat berarti bagi kami. 🙏",
    };
  }

  const data = permintaanDataSchema.parse({
    nama: jawaban.nama,
    instansi: jawaban.instansi,
    alamat: jawaban.alamat,
    noHp: jawaban.noHp,
    email: jawaban.email,
    jenisData: jawaban.jenisData,
    keperluan: jawaban.keperluan,
    formatDiinginkan: jawaban.formatDiinginkan,
    catatan: jawaban.catatan || "",
  });

  const [inserted] = await db
    .insert(permintaanData)
    .values({
      nama: data.nama,
      asalInstansi: data.instansi,
      alamat: data.alamat,
      noHp: data.noHp,
      email: data.email,
      jenisData: data.jenisData,
      keperluan: data.keperluan,
      formatDiinginkan: data.formatDiinginkan,
      catatan: data.catatan || null,
      status: "PENDING",
      sumber: "WHATSAPP",
    })
    .$returningId();

  return {
    id: inserted.id,
    pesan:
      `✅ *Permintaan data Anda sudah kami terima* (tiket #${inserted.id}).\n\n` +
      `Data: ${data.jenisData}\n\n` +
      "Tim Pelayanan Statistik Terpadu akan memproses dan menghubungi Anda lewat " +
      "email/nomor yang didaftarkan.",
  };
}
