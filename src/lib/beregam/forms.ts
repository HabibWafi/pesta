import * as z from "zod";
import { db } from "@/lib/db";
import { pengaduans, permintaanData, vidconRequests } from "@/lib/db/schema";
import { vidconSchema } from "@/lib/schemas/vidcon";
import { aduanSchema } from "@/lib/schemas/aduan";
import { permintaanDataSchema } from "@/lib/schemas/permintaan-data";
import { komponenWib } from "@/lib/waktu";
import { getConfig } from "./config";
import { beritahuPermohonanBaru } from "./notifikasi";
import type { BeregamContact } from "./db/schema";

/**
 * Formulir layanan yang diisi langsung di percakapan WhatsApp.
 *
 * SATU PESAN, BUKAN TANYA-JAWAB BERTAHAP.
 *
 * Versi pertama menanyakan isian satu per satu - sepuluh pertanyaan berarti
 * sepuluh balasan bot. Itu keliru untuk WhatsApp, karena dua alasan yang
 * saling menguatkan:
 *
 *   1. Ada pembatas laju balasan per nomor (lihat rateLimit di config.ts).
 *      Warga yang menjawab cepat - dan itu wajar - akan menabraknya di
 *      tengah formulir, lalu bot mendadak diam. Dari sisi warga, layanannya
 *      terlihat rusak persis saat ia sedang serius memakainya.
 *   2. Sepuluh kali bolak-balik terasa lama dan mudah ditinggalkan.
 *
 * Sekarang bot mengirim satu format, warga menyalinnya, melengkapi, lalu
 * mengirim balik sekali jalan. Dua balasan bot saja untuk seluruh formulir -
 * satu format, satu konfirmasi.
 *
 * Isian yang sudah benar DIINGAT. Kalau ada yang belum pas, warga cukup
 * mengirim baris yang perlu diperbaiki saja, tidak perlu mengetik ulang
 * semuanya.
 *
 * Validasi akhir sebelum simpan SELALU lewat skema Zod yang sama dengan
 * formulir web (src/lib/schemas/*) - satu sumber kebenaran aturan, berlaku
 * untuk kanal mana pun.
 */

export type JenisForm = "vidcon" | "pengaduan" | "data";

export interface MedanForm {
  /** Nama internal, dipakai submitForm. */
  field: string;
  /** Label yang tampil di format dan dicocokkan saat menguraikan balasan. */
  label: string;
  opsional?: boolean;
  proses: (
    input: string,
    bersih: string,
    contact: BeregamContact
  ) => { ok: true; nilai: string } | { ok: false; pesan: string };
}

/** Kata yang menandakan warga melewati satu isian opsional. */
export const KATA_LEWATI = ["lewati", "skip", "nanti", "tidak", "gak", "engga", "enggak", "-"];

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
// Validator per isian
// ---------------------------------------------------------------------------

function teksMin(input: string, min: number, pesan: string) {
  const bersih = input.trim();
  if (bersih.length < min) return { ok: false, pesan } as const;
  return { ok: true, nilai: bersih } as const;
}

function validasiEmail(input: string) {
  const hasil = z.string().trim().toLowerCase().email().safeParse(input);
  return hasil.success
    ? ({ ok: true, nilai: hasil.data } as const)
    : ({ ok: false, pesan: "format email belum tepat, contoh: nama@email.com" } as const);
}

function validasiNoHp(input: string, bersih: string, contact: BeregamContact) {
  if (["sama", "ya", "iya", "sama saja", "pakai ini", "nomor ini"].includes(bersih)) {
    return { ok: true, nilai: contact.phone } as const;
  }
  const digitSaja = input.replace(/[^0-9]/g, "");
  if (digitSaja.length < 6) {
    return { ok: false, pesan: 'belum valid - tulis nomornya, atau isi "sama" untuk memakai nomor WhatsApp ini' } as const;
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
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    return { ok: false, pesan: "tanggalnya tidak ada di kalender, contoh: 25-08-2026" } as const;
  }
  if (iso < komponenWib().tanggalIso) {
    return { ok: false, pesan: "tanggalnya sudah lewat, pilih hari ini atau setelahnya" } as const;
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

  return { ok: false, pesan: "format tanggal belum dikenali, contoh: 25-08-2026" } as const;
}

function validasiJam(input: string) {
  const bersih = input.trim().replace(",", ".");
  const cocok = bersih.match(/^(\d{1,2})[:.](\d{2})$/) ?? bersih.match(/^(\d{1,2})$/);
  if (!cocok) return { ok: false, pesan: "format jam belum dikenali, contoh: 09:00" } as const;
  const jam = Number(cocok[1]);
  const menit = cocok[2] ? Number(cocok[2]) : 0;
  if (jam < 0 || jam > 23 || menit < 0 || menit > 59) {
    return { ok: false, pesan: "jamnya tidak valid, contoh: 09:00" } as const;
  }
  return { ok: true, nilai: `${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}` } as const;
}

const KATEGORI_ADUAN = [
  "Pelayanan PST",
  "Layanan ViDCon",
  "Publikasi & Data",
  "Sarana & Prasarana",
  "Lainnya",
] as const;

/** Menerima angka pilihan, ATAU teks kategorinya langsung. */
function validasiKategori(input: string, bersih: string) {
  const idx = Number(bersih) - 1;
  if (Number.isInteger(idx) && idx >= 0 && idx < KATEGORI_ADUAN.length) {
    return { ok: true, nilai: KATEGORI_ADUAN[idx] } as const;
  }
  const cocok = KATEGORI_ADUAN.find((k) => k.toLowerCase() === input.trim().toLowerCase());
  if (cocok) return { ok: true, nilai: cocok } as const;
  return { ok: false, pesan: `isi angka 1-${KATEGORI_ADUAN.length} sesuai daftar di format` } as const;
}

const FORMAT_PILIHAN: Record<string, string> = {
  "1": "SOFT_FILE",
  "2": "HARD_COPY",
  "3": "KUNJUNGAN_LANGSUNG",
};

function validasiFormatData(input: string, bersih: string) {
  const nilai = FORMAT_PILIHAN[bersih];
  if (nilai) return { ok: true, nilai } as const;
  const teks = input.trim().toLowerCase();
  if (teks.includes("soft") || teks.includes("digital")) return { ok: true, nilai: "SOFT_FILE" } as const;
  if (teks.includes("cetak") || teks.includes("hard")) return { ok: true, nilai: "HARD_COPY" } as const;
  if (teks.includes("kantor") || teks.includes("langsung")) return { ok: true, nilai: "KUNJUNGAN_LANGSUNG" } as const;
  return { ok: false, pesan: "isi angka 1, 2, atau 3 sesuai daftar di format" } as const;
}

// ---------------------------------------------------------------------------
// Susunan isian tiap formulir
//
// SATU sumber untuk dua hal sekaligus: teks format yang dikirim ke warga,
// DAN pencocokan label saat menguraikan balasannya. Kalau keduanya ditulis
// terpisah, cepat atau lambat labelnya bergeser dan balasan warga jadi tidak
// terbaca tanpa ada yang menyadarinya.
// ---------------------------------------------------------------------------

export const MEDAN_FORM: Record<JenisForm, MedanForm[]> = {
  vidcon: [
    { field: "nama", label: "Nama", proses: (i) => teksMin(i, 2, "minimal 2 karakter") },
    { field: "instansi", label: "Instansi", proses: (i) => teksMin(i, 2, 'minimal 2 karakter, boleh diisi "Pribadi"') },
    { field: "alamat", label: "Alamat", proses: (i) => teksMin(i, 3, "minimal 3 karakter") },
    { field: "email", label: "Email", proses: (i) => validasiEmail(i) },
    { field: "noHp", label: "No HP", proses: (i, b, c) => validasiNoHp(i, b, c) },
    { field: "topik", label: "Topik", proses: (i) => teksMin(i, 2, "sebutkan topiknya, mis. PDRB atau Inflasi") },
    { field: "deskripsi", label: "Kebutuhan", proses: (i) => teksMin(i, 10, "uraikan sedikit lebih panjang, minimal 10 karakter") },
    { field: "tanggal", label: "Tanggal", proses: (i) => validasiTanggal(i) },
    { field: "jam", label: "Jam", proses: (i) => validasiJam(i) },
    {
      field: "layananInklusifCatatan",
      label: "Pendampingan",
      opsional: true,
      proses: (i) => teksMin(i, 1, 'jelaskan singkat, atau tulis "tidak"'),
    },
  ],

  pengaduan: [
    { field: "nama", label: "Nama", proses: (i) => teksMin(i, 2, 'minimal 2 karakter, boleh diisi "Anonim"') },
    { field: "kategori", label: "Kategori", proses: (i, b) => validasiKategori(i, b) },
    { field: "detail", label: "Aduan", proses: (i) => teksMin(i, 15, "uraikan sedikit lebih panjang, minimal 15 karakter") },
    { field: "email", label: "Email", proses: (i) => validasiEmail(i) },
    { field: "noHp", label: "No HP", opsional: true, proses: (i, b, c) => validasiNoHp(i, b, c) },
  ],

  data: [
    { field: "nama", label: "Nama", proses: (i) => teksMin(i, 2, "minimal 2 karakter") },
    { field: "instansi", label: "Instansi", proses: (i) => teksMin(i, 2, 'minimal 2 karakter, boleh diisi "Pribadi"') },
    { field: "alamat", label: "Alamat", proses: (i) => teksMin(i, 3, "minimal 3 karakter") },
    { field: "email", label: "Email", proses: (i) => validasiEmail(i) },
    { field: "noHp", label: "No HP", proses: (i, b, c) => validasiNoHp(i, b, c) },
    { field: "jenisData", label: "Data diminta", proses: (i) => teksMin(i, 3, "sebutkan datanya, mis. PDRB per kecamatan 2023") },
    { field: "keperluan", label: "Keperluan", proses: (i) => teksMin(i, 5, "uraikan sedikit lebih panjang, minimal 5 karakter") },
    { field: "formatDiinginkan", label: "Format", proses: (i, b) => validasiFormatData(i, b) },
    { field: "catatan", label: "Catatan", opsional: true, proses: (i) => teksMin(i, 1, 'tulis catatannya, atau "-"') },
  ],
};

/** Keterangan tambahan di bawah format, per jenis. */
const PETUNJUK: Record<JenisForm, string> = {
  vidcon:
    `_Tanggal contoh: 25-08-2026. Jam contoh: 09:00 (hari kerja ${"{jam_layanan}"})._\n` +
    '_No HP: tulis "sama" untuk memakai nomor WhatsApp ini._\n' +
    '_Pendampingan: isi bila perlu juru bahasa isyarat, kursi roda, atau pendampingan lansia. Kalau tidak perlu, tulis "tidak"._',
  pengaduan:
    "_Kategori: 1=Pelayanan PST, 2=Layanan ViDCon, 3=Publikasi & Data, 4=Sarana & Prasarana, 5=Lainnya._\n" +
    '_Nama boleh diisi "Anonim". No HP boleh dikosongkan dengan tanda "-"._',
  data:
    "_Format: 1=Berkas digital, 2=Cetak, 3=Ambil langsung di kantor._\n" +
    '_No HP: tulis "sama" untuk memakai nomor WhatsApp ini. Catatan boleh diisi "-"._',
};

const JUDUL: Record<JenisForm, string> = {
  vidcon: "💬 *FORMULIR VIDCON - KONSULTASI STATISTIK*",
  pengaduan: "📮 *FORMULIR ADUAN & SARAN*",
  data: "🗂️ *FORMULIR PERMINTAAN DATA*",
};

/**
 * Menyusun teks format yang dikirim ke warga.
 *
 * Barisnya sengaja polos "Label:" tanpa contoh menempel, supaya warga bisa
 * menyalin seluruh pesan lalu mengetik di belakang titik dua tanpa perlu
 * menghapus apa pun lebih dulu.
 */
export function teksFormat(jenis: JenisForm): string {
  const baris = MEDAN_FORM[jenis]
    .map((m) => `${m.label}:${m.opsional ? " -" : ""}`)
    .join("\n");

  return (
    `${JUDUL[jenis]}\n\n` +
    "Salin pesan ini, lengkapi setelah tanda titik dua, lalu kirim kembali " +
    "dalam *satu* pesan.\n\n" +
    `${baris}\n\n` +
    `${PETUNJUK[jenis].replace("{jam_layanan}", deskripsiJamLayanan())}\n\n` +
    "Ketik *batal* kapan saja untuk keluar."
  );
}

// ---------------------------------------------------------------------------
// Menguraikan balasan warga
// ---------------------------------------------------------------------------

/** Membersihkan label: buang penebalan WhatsApp dan spasi berlebih. */
function normalkanLabel(teks: string): string {
  return teks.replace(/[*_~]/g, "").trim().toLowerCase();
}

/**
 * Memisahkan pesan warga menjadi pasangan label -> isi.
 *
 * Baris yang TIDAK diawali label dikenal dianggap sambungan isi baris
 * sebelumnya. Itu penting: uraian aduan dan keperluan data sering ditulis
 * beberapa baris, dan memotongnya di baris pertama akan membuang sebagian
 * besar penjelasan warga tanpa ada yang tahu.
 */
export function uraikanBalasan(jenis: JenisForm, teks: string): Record<string, string> {
  const medanPerLabel = new Map(MEDAN_FORM[jenis].map((m) => [normalkanLabel(m.label), m]));
  const hasil: Record<string, string> = {};
  let medanAktif: MedanForm | null = null;

  for (const barisMentah of teks.split("\n")) {
    const baris = barisMentah.trim();
    const posisi = baris.indexOf(":");

    if (posisi > 0) {
      const kandidat = medanPerLabel.get(normalkanLabel(baris.slice(0, posisi)));
      if (kandidat) {
        medanAktif = kandidat;
        hasil[kandidat.field] = baris.slice(posisi + 1).trim();
        continue;
      }
    }

    if (medanAktif && baris) {
      hasil[medanAktif.field] = `${hasil[medanAktif.field] ?? ""}\n${baris}`.trim();
    }
  }

  return hasil;
}

export interface HasilPeriksa {
  /** Isian yang sudah lolos validasi - digabung dengan yang tersimpan sebelumnya. */
  jawaban: Record<string, string>;
  /** Label + alasan untuk isian yang belum benar. Kosong berarti formulir lengkap. */
  masalah: { label: string; pesan: string }[];
  /** Ada label dikenal di pesan ini? False berarti warga membalas di luar format. */
  adaLabelDikenali: boolean;
}

/**
 * Menggabungkan balasan baru dengan isian yang sudah benar sebelumnya, lalu
 * memeriksa mana yang masih kurang.
 *
 * Penggabungan inilah yang membuat warga tidak perlu mengetik ulang seluruh
 * formulir hanya karena satu baris salah - cukup kirim baris itu saja.
 */
export function periksaForm(
  jenis: JenisForm,
  teks: string,
  tersimpan: Record<string, string>,
  contact: BeregamContact
): HasilPeriksa {
  const mentah = uraikanBalasan(jenis, teks);
  const jawaban: Record<string, string> = { ...tersimpan };
  const masalah: { label: string; pesan: string }[] = [];

  for (const medan of MEDAN_FORM[jenis]) {
    const punyaKiriman = Object.prototype.hasOwnProperty.call(mentah, medan.field);
    const isi = (mentah[medan.field] ?? "").trim();
    const bersih = isi.toLowerCase();

    // Isian opsional yang dikosongkan atau ditandai lewat.
    if (medan.opsional && punyaKiriman && (isi === "" || KATA_LEWATI.includes(bersih))) {
      jawaban[medan.field] = "";
      continue;
    }

    if (punyaKiriman && isi !== "") {
      const hasil = medan.proses(isi, bersih, contact);
      if (hasil.ok) {
        jawaban[medan.field] = hasil.nilai;
        continue;
      }
      masalah.push({ label: medan.label, pesan: hasil.pesan });
      delete jawaban[medan.field];
      continue;
    }

    // Tidak dikirim kali ini - pakai yang sudah tersimpan bila ada.
    if (Object.prototype.hasOwnProperty.call(jawaban, medan.field)) continue;
    if (medan.opsional) {
      jawaban[medan.field] = "";
      continue;
    }
    masalah.push({ label: medan.label, pesan: "belum diisi" });
  }

  return { jawaban, masalah, adaLabelDikenali: Object.keys(mentah).length > 0 };
}

/** Menyusun satu pesan berisi seluruh isian yang masih perlu diperbaiki. */
export function pesanMasalah(masalah: { label: string; pesan: string }[]): string {
  const daftar = masalah.map((m) => `• *${m.label}* - ${m.pesan}`).join("\n");
  return (
    `Sedikit lagi! Ada ${masalah.length} isian yang belum pas:\n\n` +
    `${daftar}\n\n` +
    "Kirim ulang baris yang perlu diperbaiki saja (isian lain sudah kami simpan), " +
    "atau ketik *batal* untuk keluar."
  );
}

// ---------------------------------------------------------------------------
// Penyimpanan akhir
// ---------------------------------------------------------------------------

/**
 * Menyimpan jawaban lengkap ke tabel yang sama dengan formulir web.
 *
 * Divalidasi ULANG lewat skema Zod domain masing-masing - pemeriksaan per
 * isian di atas hanya percepatan pengalaman warga, bukan pengganti satu
 * sumber kebenaran aturan bisnis.
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

    await beritahuPermohonanBaru({
      jenis: "vidcon",
      id: inserted.id,
      nama: data.nama,
      sumber: "WHATSAPP",
      kontak: data.noHp,
      baris: [
        `Instansi: ${data.instansi}`,
        `Topik: ${data.topik}`,
        `Jadwal diminta: ${data.tanggal} pukul ${data.jam} WIB`,
        data.layananInklusifCatatan ? `Perlu pendampingan: ${data.layananInklusifCatatan}` : "",
      ],
    });

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
      jenisKelamin: "",
      asalInstansi: "",
      kategori: jawaban.kategori,
      detail: jawaban.detail,
    });

    const [inserted] = await db
      .insert(pengaduans)
      .values({
        nama: data.nama,
        email: data.email,
        noHp: data.noHp || null,
        jenisKelamin: null,
        asalInstansi: null,
        kategori: data.kategori,
        detail: data.detail,
        status: "PENDING",
        sumber: "WHATSAPP",
      })
      .$returningId();

    await beritahuPermohonanBaru({
      jenis: "pengaduan",
      id: inserted.id,
      nama: data.nama,
      sumber: "WHATSAPP",
      kontak: data.noHp || data.email,
      baris: [`Kategori: ${data.kategori}`],
    });

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

  await beritahuPermohonanBaru({
    jenis: "data",
    id: inserted.id,
    nama: data.nama,
    sumber: "WHATSAPP",
    kontak: data.noHp,
    baris: [
      `Instansi: ${data.instansi}`,
      `Data diminta: ${data.jenisData}`,
      `Keperluan: ${data.keperluan}`,
    ],
  });

  return {
    id: inserted.id,
    pesan:
      `✅ *Permintaan data Anda sudah kami terima* (tiket #${inserted.id}).\n\n` +
      `Data: ${data.jenisData}\n\n` +
      "Tim Pelayanan Statistik Terpadu akan memproses dan menghubungi Anda lewat " +
      "email/nomor yang didaftarkan.\n\n" +
      "_Perlu melampirkan berkas pendukung (contoh format tabel, surat pengantar)? " +
      "Ajukan lewat web: https://bpskabmusirawas.com_",
  };
}
