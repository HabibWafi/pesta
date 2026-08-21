import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  beregamContacts,
  beregamFaq,
  beregamHandovers,
  beregamHolidays,
  beregamMessages,
  beregamSessions,
  type BeregamContact,
  type BeregamSession,
  type SumberPesan,
} from "../db/schema";
import {
  ambilAtauBuatSesi,
  ambilHealth,
  hitungBalasanSemenit,
  hitungKirimHariIni,
} from "../db/queries";
import { getConfig } from "../config";
import { getGateway } from "../drivers";
import { komponenWib, samarkanNomor, tambahMenit } from "@/lib/waktu";

/**
 * Mesin state percakapan Beregam.
 *
 * DETERMINISTIK, BUKAN AI. Fase 1 tidak memakai model sama sekali.
 * Setiap balasan bisa ditelusuri ke satu cabang di berkas ini.
 *
 * Yang membuat percakapan terasa nyambung padahal setiap pesan masuk adalah
 * request HTTP yang berdiri sendiri: kolom `state` dibaca sebelum menjawab
 * dan ditulis ulang sesudahnya.
 */

const KATA_MENU = ["menu", "0", "batal", "kembali", "mulai"];
const KATA_PETUGAS = ["petugas", "admin", "manusia", "operator", "cs"];
const KATA_BERHENTI = ["stop", "berhenti", "unsubscribe", "hapus saya"];

const SAPAAN =
  "Halo! 👋 Saya *Beregam*, asisten layanan BPS Kabupaten Musi Rawas.\n\n" +
  "Ini balasan otomatis. Petugas kami melayani pada hari dan jam kerja.\n" +
  "Percakapan ini disimpan untuk keperluan layanan.";

export class BeregamService {
  private gateway = getGateway();

  /**
   * Menangani satu pesan masuk.
   *
   * Urutan langkahnya tidak boleh diacak - masing-masing mengandaikan
   * langkah sebelumnya sudah dijalankan.
   */
  async handleIncoming(
    contact: BeregamContact,
    teks: string,
    opsi: { stale?: boolean } = {}
  ): Promise<void> {
    const config = getConfig();
    const bersih = this.normalkan(teks);
    const sesi = await ambilAtauBuatSesi(contact.id);

    // --- LANGKAH 1: saklar darurat -----------------------------------------
    // Admin bisa mematikan seluruh balasan otomatis dari panel, dan panel
    // itu tetap hidup di Hostinger meskipun PC kantor mati total.
    const health = await ambilHealth();
    if (!health.botEnabled) {
      await this.sentuhSesi(sesi.id);
      return;
    }

    // --- LANGKAH 2: pagar pesan basi ---------------------------------------
    // Saat PC pulih dari mati, WhatsApp mengirimkan seluruh pesan tertahan
    // sekaligus. Tanpa pagar ini, bot memproses semuanya dan warga menerima
    // balasan atas pertanyaan yang sudah diselesaikan admin berjam-jam lalu.
    if (opsi.stale) {
      await this.sentuhSesi(sesi.id);
      return;
    }

    // --- LANGKAH 3: MODE MANUAL --------------------------------------------
    //
    // BARIS TERPENTING DI SELURUH MODUL INI.
    //
    // Saat petugas sedang memegang percakapan, bot HARUS DIAM TOTAL. Tanpa
    // pemeriksaan ini warga menerima dua jawaban sekaligus - dari petugas
    // dan dari bot - dan bug itu baru ketahuan setelah petugas mulai
    // memakai inbox, yaitu saat kepercayaan sudah terlanjur dibangun.
    if (sesi.mode === "manual") {
      await this.sentuhSesi(sesi.id);
      await this.tandaiHandoverBelumDibaca(contact.id);
      return;
    }

    // --- LANGKAH 4: warga yang sudah menyatakan berhenti --------------------
    if (contact.optedOutAt) {
      // Diam total. Satu-satunya jalan kembali adalah lewat petugas.
      await this.sentuhSesi(sesi.id);
      return;
    }

    if (KATA_BERHENTI.includes(bersih)) {
      await db
        .update(beregamContacts)
        .set({ optedOutAt: new Date() })
        .where(eq(beregamContacts.id, contact.id));
      await this.balas(
        contact,
        "Baik, kami berhenti mengirim balasan otomatis ke nomor ini.\n\n" +
          "Anda tetap bisa menghubungi Pelayanan Statistik Terpadu BPS " +
          "Kabupaten Musi Rawas lewat telepon atau datang langsung.",
        "bot"
      );
      return;
    }

    // --- LANGKAH 5: kontak diblokir -----------------------------------------
    if (contact.isBlocked) {
      await this.sentuhSesi(sesi.id);
      return;
    }

    // --- LANGKAH 6: pembatas laju ------------------------------------------
    // Diam saja bila sudah terlalu sering membalas. Bukan melempar galat:
    // memberi tahu warga bahwa ia dibatasi justru mengundang percobaan.
    if ((await hitungBalasanSemenit(contact.id)) >= config.rateLimit.perMinute) {
      await this.sentuhSesi(sesi.id);
      return;
    }

    if ((await hitungKirimHariIni()) >= config.rateLimit.dailyCap) {
      await this.catatBatasHarian();
      await this.sentuhSesi(sesi.id);
      return;
    }

    // --- LANGKAH 7: kata kunci global --------------------------------------
    if (KATA_PETUGAS.includes(bersih)) {
      await this.escalate(contact, "Diminta warga");
      return;
    }

    if (KATA_MENU.includes(bersih)) {
      await this.kirimMenuUtama(contact, sesi, { sapa: false });
      return;
    }

    // --- LANGKAH 8: sesi baru atau kedaluwarsa ------------------------------
    const kedaluwarsa = !sesi.expiresAt || sesi.expiresAt < new Date();
    if (kedaluwarsa || sesi.state === "idle") {
      await this.kirimMenuUtama(contact, sesi, { sapa: true });
      return;
    }

    // --- LANGKAH 9: pilihan menu -------------------------------------------
    if (sesi.state === "main_menu" && /^[1-9][0-9]?$/.test(bersih)) {
      const terjawab = await this.jawabMenu(contact, sesi, bersih);
      if (terjawab) return;
    }

    // --- LANGKAH 10: tidak dikenali ----------------------------------------
    await this.tidakPaham(contact, sesi);
  }

  // =========================================================================
  // Bagian-bagian penyusun
  // =========================================================================

  /** Membuang emoji, merapikan spasi, menyeragamkan huruf. */
  private normalkan(teks: string): string {
    return teks
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /** Memperpanjang masa sesi tanpa mengubah apa pun yang lain. */
  private async sentuhSesi(sesiId: number): Promise<void> {
    const sekarang = new Date();
    await db
      .update(beregamSessions)
      .set({
        lastActivityAt: sekarang,
        expiresAt: tambahMenit(getConfig().sessionTtlMinutes, sekarang),
      })
      .where(eq(beregamSessions.id, sesiId));
  }

  /**
   * Mengirim balasan lewat gateway.
   *
   * SELALU lewat gateway, tidak pernah menulis ke tabel outbox langsung.
   * Itu yang menjaga agar pergantian engine nanti tidak menyentuh berkas ini.
   */
  private async balas(
    contact: BeregamContact,
    teks: string,
    source: SumberPesan,
    delaySeconds?: number
  ): Promise<void> {
    await this.gateway.queueText(contact.id, contact.waId, teks, {
      source,
      delaySeconds,
    });
  }

  /** Menyusun dan mengirim menu utama dari tabel FAQ. */
  private async kirimMenuUtama(
    contact: BeregamContact,
    sesi: BeregamSession,
    opsi: { sapa: boolean }
  ): Promise<void> {
    const menu = await db
      .select()
      .from(beregamFaq)
      .where(and(eq(beregamFaq.isActive, true)))
      .orderBy(asc(beregamFaq.sortOrder), asc(beregamFaq.id));

    const pilihan = menu.filter((m) => m.menuKey && !m.parentKey);

    // Menu kosong berarti tabel beregam_faq belum diisi di server ini -
    // biasanya karena seeder belum dijalankan setelah deploy. Tanpa cabang
    // ini warga menerima sapaan lalu "Silakan balas dengan angka" tanpa satu
    // pun angka di bawahnya, dan tidak ada yang tahu harus mengetik apa.
    // Lebih baik langsung dilempar ke petugas daripada dibiarkan menebak.
    if (pilihan.length === 0) {
      console.error(
        "[beregam] beregam_faq kosong - menu tidak bisa disusun. " +
          "Jalankan: npm run db:seed:beregam"
      );
      await this.escalate(contact, "menu bot belum tersedia");
      return;
    }

    const baris = pilihan.map((m) => `${m.menuKey}. ${m.title}`);
    const header = opsi.sapa
      ? `${SAPAAN}\n\nSilakan balas dengan *angka*:`
      : "Silakan balas dengan *angka*:";

    await this.gateway.queueMenu(contact.id, contact.waId, header, [
      ...baris,
      "",
      "Ketik *menu* kapan saja untuk kembali ke sini.",
    ], { source: "bot" });

    const sekarang = new Date();
    await db
      .update(beregamSessions)
      .set({
        state: "main_menu",
        missCount: 0,
        lastActivityAt: sekarang,
        expiresAt: tambahMenit(getConfig().sessionTtlMinutes, sekarang),
      })
      .where(eq(beregamSessions.id, sesi.id));
  }

  /** Menjawab pilihan menu. Mengembalikan false bila angkanya tidak ada. */
  private async jawabMenu(
    contact: BeregamContact,
    sesi: BeregamSession,
    angka: string
  ): Promise<boolean> {
    const [entri] = await db
      .select()
      .from(beregamFaq)
      .where(and(eq(beregamFaq.menuKey, angka), eq(beregamFaq.isActive, true)))
      .limit(1);

    if (!entri) return false;

    // Menu "bicara dengan petugas" tidak punya jawaban - ia mengeskalasi.
    if (entri.answer.trim() === "[ESKALASI]") {
      await this.escalate(contact, `Menu ${angka}: ${entri.title}`);
      return true;
    }

    await this.balas(contact, entri.answer, "faq");

    // Menu dikirim ulang di bawah jawaban, dengan jeda bertingkat supaya
    // urutan sampainya benar dan terlihat wajar.
    await this.gateway.queueText(
      contact.id,
      contact.waId,
      "Ketik *menu* untuk melihat pilihan lain, atau *petugas* untuk bicara dengan staf kami.",
      { source: "bot", delaySeconds: 4 }
    );

    await this.sentuhSesi(sesi.id);
    return true;
  }

  /** Menangani input yang tidak dikenali, dengan eskalasi otomatis. */
  private async tidakPaham(
    contact: BeregamContact,
    sesi: BeregamSession
  ): Promise<void> {
    const miss = sesi.missCount + 1;

    if (miss >= 3) {
      await this.escalate(contact, "Tiga kali tidak dipahami bot");
      await db
        .update(beregamSessions)
        .set({ missCount: 0 })
        .where(eq(beregamSessions.id, sesi.id));
      return;
    }

    await this.balas(
      contact,
      "Maaf, saya belum paham maksud Anda. 🙏\n\n" +
        "Ketik *menu* untuk melihat pilihan layanan, atau *petugas* untuk " +
        "bicara langsung dengan staf kami.",
      "bot"
    );

    await db
      .update(beregamSessions)
      .set({ missCount: miss })
      .where(eq(beregamSessions.id, sesi.id));

    await this.sentuhSesi(sesi.id);
  }

  /**
   * Melempar percakapan ke inbox petugas.
   *
   * Sekaligus menyetel mode manual, sehingga bot langsung diam. Hanya
   * petugas yang bisa melepasnya kembali - warga yang mengetik "menu" saat
   * mode manual TIDAK mengubah apa pun.
   */
  async escalate(contact: BeregamContact, alasan: string): Promise<void> {
    const [terbuka] = await db
      .select({ id: beregamHandovers.id })
      .from(beregamHandovers)
      .where(
        and(eq(beregamHandovers.contactId, contact.id), eq(beregamHandovers.status, "open"))
      )
      .limit(1);

    if (!terbuka) {
      await db.insert(beregamHandovers).values({
        contactId: contact.id,
        channel: "wa",
        reason: alasan.slice(0, 150),
        status: "open",
      });
    }

    await db
      .update(beregamSessions)
      .set({ mode: "manual", state: "manual", lastActivityAt: new Date() })
      .where(eq(beregamSessions.contactId, contact.id));

    const diLuarJam = !(await this.isJamLayanan());
    const catatan = diLuarJam
      ? "\n\nSaat ini di luar jam layanan. Petugas akan membalas pada hari kerja berikutnya."
      : "";

    await this.balas(
      contact,
      `Baik, saya sambungkan ke petugas Pelayanan Statistik Terpadu.${catatan}\n\n` +
        "Mohon tunggu, pesan Anda sudah masuk ke antrean petugas.",
      "bot"
    );

    console.info(
      `[beregam] eskalasi kontak=${samarkanNomor(contact.phone)} alasan="${alasan}"`
    );
  }

  /** Menandai handover terbuka agar muncul sebagai belum dibaca di inbox. */
  private async tandaiHandoverBelumDibaca(contactId: number): Promise<void> {
    await db
      .update(beregamHandovers)
      .set({ updatedAt: new Date() })
      .where(and(eq(beregamHandovers.contactId, contactId), eq(beregamHandovers.status, "claimed")));
  }

  /**
   * Apakah sekarang jam layanan menurut WIB.
   *
   * Memeriksa hari kerja, jam, DAN hari libur nasional. Tanpa pemeriksaan
   * libur, bot akan menjanjikan "petugas membalas hari kerja berikutnya"
   * padahal besok cuti bersama.
   */
  async isJamLayanan(): Promise<boolean> {
    const config = getConfig();
    const w = komponenWib();

    if (!config.jamLayanan.hariKerja.includes(w.hari)) return false;
    if (w.jam < config.jamLayanan.jamBuka || w.jam >= config.jamLayanan.jamTutup) return false;

    const [libur] = await db
      .select({ id: beregamHolidays.id })
      .from(beregamHolidays)
      .where(eq(beregamHolidays.tanggal, w.tanggalIso))
      .limit(1);

    return !libur;
  }

  /**
   * Membalas pesan yang bukan teks.
   *
   * Dipisah dari handleIncoming() karena foto atau stiker BUKAN kesalahan
   * warga - menaikkan hitungan "tidak paham" untuk itu tidak adil, dan
   * akan mengeskalasi orang yang sekadar mengirim satu stiker.
   */
  async balasBukanTeks(contact: BeregamContact, jenis: string): Promise<void> {
    const sesi = await ambilAtauBuatSesi(contact.id);

    if (sesi.mode === "manual") {
      await this.sentuhSesi(sesi.id);
      return;
    }

    const health = await ambilHealth();
    if (!health.botEnabled || contact.isBlocked || contact.optedOutAt) {
      await this.sentuhSesi(sesi.id);
      return;
    }

    if ((await hitungBalasanSemenit(contact.id)) >= getConfig().rateLimit.perMinute) {
      await this.sentuhSesi(sesi.id);
      return;
    }

    const namaJenis: Record<string, string> = {
      image: "gambar",
      video: "video",
      document: "dokumen",
      sticker: "stiker",
      location: "lokasi",
      contact: "kontak",
      vcard: "kontak",
    };
    const sebutan = namaJenis[jenis] ?? "berkas";

    await this.balas(
      contact,
      `Terima kasih, tetapi saya hanya bisa membaca pesan *teks* dan belum ` +
        `dapat memproses ${sebutan}. 🙏

` +
        "Silakan tuliskan pertanyaan Anda, ketik *menu* untuk melihat pilihan " +
        "layanan, atau *petugas* untuk bicara langsung dengan staf kami.",
      "bot"
    );

    await this.sentuhSesi(sesi.id);
  }

  /** Mencatat pesan masuk atau keluar ke riwayat. */
  async catatPesan(nilai: {
    contactId: number;
    direction: "in" | "out";
    waMessageId?: string | null;
    type?: string;
    body?: string | null;
    source?: SumberPesan | null;
    sentBy?: number | null;
    raw?: unknown;
  }): Promise<void> {
    await db.insert(beregamMessages).values({
      contactId: nilai.contactId,
      direction: nilai.direction,
      waMessageId: nilai.waMessageId ?? null,
      type: nilai.type ?? "text",
      body: nilai.body ?? null,
      source: nilai.source ?? null,
      sentBy: nilai.sentBy ?? null,
      raw: nilai.raw ?? null,
    });
  }

  /** Mencatat bahwa batas harian tercapai, sekali sehari saja. */
  private async catatBatasHarian(): Promise<void> {
    console.warn("[beregam] batas harian pesan keluar tercapai");
  }

  /**
   * Menangani hasil pekerjaan AI.
   *
   * Fase 1 belum memakai AI, jadi selalu mengembalikan null. Diisi pada
   * Fase 2 saat pencarian semantik masuk.
   */
  async handleAiResult(): Promise<string | null> {
    return null;
  }
}

/** Instance bersama. Service ini tidak menyimpan keadaan antar permintaan. */
let instance: BeregamService | null = null;

export function getBeregamService(): BeregamService {
  instance ??= new BeregamService();
  return instance;
}
