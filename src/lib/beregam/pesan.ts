import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { beregamSettings } from "./db/schema";

/**
 * Naskah pesan sistem Beregam - bisa diedit dari admin.
 *
 * BERBEDA dari beregam_faq: baris di sana adalah MENU bernomor yang dipilih
 * warga ("balas dengan angka"). Naskah di sini dikirim OTOMATIS oleh alur
 * percakapan - sapaan, "tidak paham", eskalasi, dan sejenisnya. Sebelumnya
 * semuanya ditulis tetap di beregam-service.ts; sekarang tersimpan di
 * database, dan berkas ini adalah SATU-SATUNYA tempat kunci dan naskah
 * bawaannya didaftarkan.
 *
 * Pola cache-nya sengaja meniru src/lib/content/settings.ts: dicache
 * dengan tag, admin panel membatalkan cache itu setelah menyimpan lewat
 * segarkanPesanBeregam(). Naskah bawaan di bawah ini juga jadi CADANGAN -
 * kalau baris di database belum ada (migrasi belum jalan, atau admin belum
 * pernah mengubahnya), bot tetap memakai naskah ini. Bot tidak pernah
 * berhenti berfungsi hanya karena tabel pesan sistem kosong.
 */

export interface DefinisiPesan {
  label: string;
  bawaan: string;
  /** Petunjuk singkat untuk admin - variabel apa saja yang bisa dipakai. */
  bantuan?: string;
}

export const DEFINISI_PESAN = {
  sapaan: {
    label: "Sapaan pembuka",
    bantuan: "Dikirim di awal percakapan, atau saat sesi lama sudah kedaluwarsa.",
    bawaan:
      "Halo, selamat datang! 👋\n" +
      "Saya *Beregam*, asisten virtual Pelayanan Statistik Terpadu BPS Kabupaten Musi Rawas.\n\n" +
      "Saya balasan otomatis, siap membantu kapan saja. Untuk mengobrol langsung, " +
      "petugas kami hadir di hari dan jam kerja.\n" +
      "Percakapan ini kami simpan untuk keperluan layanan.",
  },
  menu_intro: {
    label: "Ajakan memilih menu (sapaan pertama)",
    bantuan: "Baris tepat sebelum daftar menu bernomor, saat baru pertama disapa.",
    bawaan: "Silakan pilih salah satu, cukup balas dengan *angka* ya:",
  },
  menu_intro_ulang: {
    label: "Ajakan memilih menu (dipanggil ulang)",
    bantuan: "Dipakai saat warga mengetik 'menu' di tengah percakapan, bukan sapaan pertama.",
    bawaan: "Mau lihat apa lagi? Balas dengan *angka* ya:",
  },
  menu_footer: {
    label: "Penutup daftar menu",
    bawaan:
      "Ketik *menu* kapan saja untuk kembali ke daftar ini, atau *nilai* " +
      "untuk memberi penilaian dan masukan.",
  },
  menu_footer_jawaban: {
    label: "Ajakan setelah menjawab satu menu",
    bantuan: "Dikirim sebagai pesan kedua, setelah jawaban satu pilihan menu.",
    bawaan:
      "Ada yang bisa dibantu lagi? Ketik *menu* untuk pilihan lainnya, atau " +
      "*petugas* kalau ingin ngobrol langsung dengan staf kami. 😊",
  },
  tidak_paham: {
    label: "Pesan tidak dipahami",
    bawaan:
      "Waduh, sepertinya saya belum menangkap maksud Anda. 🙏\n\n" +
      "Coba ketik *menu* untuk melihat pilihan layanan, atau *petugas* " +
      "kalau ingin langsung terhubung dengan staf kami.",
  },
  opt_out: {
    label: "Konfirmasi berhenti (STOP)",
    bawaan:
      "Baik, kami hentikan balasan otomatis ke nomor ini ya. 👍\n\n" +
      "Anda tetap bisa menghubungi Pelayanan Statistik Terpadu BPS " +
      "Kabupaten Musi Rawas lewat telepon atau datang langsung kapan saja.",
  },
  bukan_teks: {
    label: "Pesan bukan teks (foto, video, dan sejenisnya)",
    bantuan: "Variabel {jenis} otomatis diganti nama jenis berkasnya, mis. \"gambar\".",
    bawaan:
      "Terima kasih sudah mengirim {jenis} 🙏, tapi saat ini saya baru bisa " +
      "membaca pesan *teks* saja.\n\n" +
      "Coba tuliskan pertanyaan Anda ya, ketik *menu* untuk melihat pilihan " +
      "layanan, atau *petugas* untuk bicara langsung dengan staf kami.",
  },
  eskalasi_jam_kerja: {
    label: "Eskalasi ke petugas - dalam jam kerja",
    bawaan:
      "Siap! Saya sambungkan Anda ke petugas Pelayanan Statistik Terpadu ya. 🙋\n\n" +
      "Mohon tunggu sebentar, pesan Anda sudah masuk ke antrean dan " +
      "petugas akan segera membalas.",
  },
  eskalasi_luar_jam: {
    label: "Eskalasi ke petugas - di luar jam kerja",
    bantuan: "Variabel {jam_layanan} otomatis diisi jadwal jam kerja dari pengaturan.",
    bawaan:
      "Saat ini di luar jam layanan kami ({jam_layanan}). 🕗\n\n" +
      "Boleh ceritakan singkat apa yang ingin Anda tanyakan atau perlukan? " +
      "Supaya begitu jam kerja mulai, petugas kami bisa langsung memahami " +
      "dan merespons lebih cepat.\n\n" +
      "Tenang, pesan Anda tetap kami sampaikan ke petugas sekarang juga " +
      "kok, walau sedang di luar jam layanan. 🙏",
  },
  eskalasi_minta_ulang: {
    label: "Eskalasi - keterangan kosong, diminta lagi",
    bantuan: "Dikirim kalau balasan warga kosong (mis. cuma emoji yang tersaring).",
    bawaan: "Boleh dituliskan dalam beberapa kata saja ya, secukupnya. 🙏",
  },
  penilaian_minta: {
    label: "Minta penilaian setelah percakapan selesai",
    bantuan:
      "Dikirim otomatis begitu petugas menandai percakapan selesai. Angka 1-5 yang dibalas warga langsung tersimpan.",
    bawaan:
      "Percakapan Anda sudah diselesaikan petugas kami. 🙏\n\n" +
      "Boleh minta waktunya sebentar? Seberapa puas Anda dengan layanan tadi?\n\n" +
      "Balas dengan *angka 1 sampai 5*:\n" +
      "5 = Sangat puas\n" +
      "4 = Puas\n" +
      "3 = Cukup\n" +
      "2 = Kurang puas\n" +
      "1 = Tidak puas\n\n" +
      "Ketik *lewati* bila sedang tidak sempat.",
  },
  penilaian_terima: {
    label: "Penilaian diterima, tawarkan masukan tertulis",
    bantuan: "Variabel {skor} otomatis diisi angka yang dipilih warga.",
    bawaan:
      "Terima kasih atas penilaiannya ({skor}/5)! ⭐\n\n" +
      "Kalau ada masukan atau saran, silakan tuliskan sekarang - sangat membantu " +
      "kami memperbaiki layanan.\n\n" +
      "Atau ketik *lewati* kalau sudah cukup.",
  },
  penilaian_terima_komentar: {
    label: "Masukan tertulis diterima",
    bawaan:
      "Masukan Anda sudah kami catat dan akan disampaikan ke petugas terkait. " +
      "Terima kasih banyak sudah meluangkan waktu! 🙏\n\n" +
      "Ketik *menu* kapan saja bila butuh layanan lain.",
  },
  penilaian_dilewati: {
    label: "Warga melewati penilaian",
    bawaan:
      "Baik, tidak masalah. Terima kasih sudah menghubungi kami! 😊\n\n" +
      "Ketik *menu* kapan saja bila butuh layanan lain.",
  },
  eskalasi_terima_konteks: {
    label: "Eskalasi - keterangan warga sudah diterima",
    bantuan: "Variabel {jam_layanan} otomatis diisi jadwal jam kerja dari pengaturan.",
    bawaan:
      "Terima kasih, sudah kami sampaikan ke petugas ya. ✅\n\n" +
      "Kami akan menghubungi Anda kembali begitu jam layanan dimulai " +
      "({jam_layanan}). Kalau ada hal yang mendesak, petugas kami tetap " +
      "dapat memantau pesan ini.\n\n" +
      "Ketik *menu* kapan saja bila ingin melihat layanan lain sementara menunggu. 😊",
  },
} satisfies Record<string, DefinisiPesan>;

export type KunciPesan = keyof typeof DEFINISI_PESAN;

const ambilSemuaPesan = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      const baris = await db.select().from(beregamSettings);
      return Object.fromEntries(baris.map((b) => [b.kunci, b.nilai]));
    } catch (error) {
      console.error("[beregam] gagal membaca beregam_settings:", error);
      return {};
    }
  },
  ["beregam-pesan-sistem"],
  { tags: ["beregam-pesan"], revalidate: 300 }
);

/**
 * Mengambil satu naskah pesan, dengan variabel `{nama}` disisipkan.
 *
 * Memakai baris database bila ada, jatuh ke naskah bawaan bila tidak -
 * jadi aman dipanggil bahkan sebelum migrasi 0006 pernah dijalankan.
 */
export async function ambilPesan(
  kunci: KunciPesan,
  variabel: Record<string, string> = {}
): Promise<string> {
  const semua = await ambilSemuaPesan();
  let teks = semua[kunci] ?? DEFINISI_PESAN[kunci].bawaan;

  for (const [nama, nilai] of Object.entries(variabel)) {
    teks = teks.replaceAll(`{${nama}}`, nilai);
  }

  return teks;
}

/** Dipanggil admin panel setelah menyimpan perubahan naskah. */
export function segarkanPesanBeregam(): void {
  revalidateTag("beregam-pesan", { expire: 0 });
}
