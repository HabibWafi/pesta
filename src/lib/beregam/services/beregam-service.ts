import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  beregamContacts,
  beregamFaq,
  beregamHandovers,
  beregamHolidays,
  beregamMessages,
  beregamPenilaian,
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
import { ambilPesan } from "../pesan";
import { kirimNotifikasiPetugas } from "../notifikasi";
import { pesanPublikasi, pesanTabelStatistik } from "../bps-pesan";
import {
  deskripsiJamLayanan,
  KATA_LEWATI,
  MEDAN_FORM,
  pesanMasalah,
  periksaForm,
  submitForm,
  teksFormat,
  type JenisForm,
} from "../forms";
import { formatWib, komponenWib, samarkanNomor, tambahMenit } from "@/lib/waktu";

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

/**
 * Membuka penilaian atas kemauan sendiri.
 *
 * Penilaian juga ditanyakan otomatis saat petugas menandai percakapan
 * selesai, tapi itu hanya menjangkau percakapan yang sampai ke petugas -
 * sebagian besar percakapan selesai di bot dan tidak pernah ditanya apa pun.
 * Kata kunci ini yang membukanya untuk semua orang.
 */
const KATA_NILAI = ["nilai", "penilaian", "feedback", "masukan", "saran", "rating"];

/** Sesi menunggu warga menuliskan keperluannya (eskalasi di luar jam kerja). */
const STATE_MENUNGGU_KONTEKS = "awaiting_escalation_reason";
/** Sesi menunggu warga membalas angka 1-5 setelah percakapan diselesaikan. */
const STATE_MENUNGGU_SKOR = "awaiting_rating_score";
/** Skor sudah diterima, menunggu masukan tertulis yang sifatnya opsional. */
const STATE_MENUNGGU_KOMENTAR = "awaiting_rating_comment";
/** Sesi sedang mengisi formulir layanan (ViDCon, pengaduan, atau permintaan data). */
const STATE_FORM = "filling_form";

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
      await this.balas(contact, await ambilPesan("opt_out"), "bot");
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

    // Tanpa handover - penilaian atas kemauan sendiri tidak melekat pada
    // percakapan petugas mana pun, dan itu memang wajar.
    if (KATA_NILAI.includes(bersih)) {
      await this.mintaPenilaian(contact, null);
      return;
    }

    // --- LANGKAH 7b: menunggu keterangan eskalasi di luar jam kerja ---------
    //
    // Dipasang escalate() saat warga minta bicara petugas di luar jam kerja.
    // Pesan APA PUN yang masuk di sini diperlakukan sebagai keterangan
    // keperluan mereka - bukan dicocokkan ke menu.
    //
    // SENGAJA diperiksa SEBELUM pagar kedaluwarsa (LANGKAH 8) di bawah.
    // sessionTtlMinutes hanya 30 menit, dan warga wajar butuh waktu lebih
    // lama untuk mengetik keperluannya. Kalau pagar kedaluwarsa diperiksa
    // lebih dulu, keterangan yang telat sedikit saja akan disambut sapaan
    // "halo, selamat datang" alih-alih diterima sebagai jawaban - dan
    // keperluan yang sudah susah payah diketik warga hilang begitu saja.
    if (sesi.state === STATE_MENUNGGU_KONTEKS) {
      await this.terimaKonteksEskalasi(contact, sesi, teks.trim());
      return;
    }

    // --- LANGKAH 7c: mengisi formulir layanan -------------------------------
    //
    // Sama seperti LANGKAH 7b: diperiksa SEBELUM pagar kedaluwarsa. Formulir
    // ViDCon punya sepuluh isian - menyalin format, melengkapinya, lalu
    // mengirim balik wajar memakan waktu lebih dari 30 menit, apalagi bila
    // warga perlu mencari alamat email atau memikirkan uraian keperluannya.
    // Kalau pagar kedaluwarsa diperiksa lebih dulu, formulir yang sudah
    // susah payah diketik akan disambut sapaan "halo, selamat datang" dan
    // seluruh isinya hilang.
    if (sesi.state === STATE_FORM) {
      await this.lanjutkanForm(contact, sesi, teks.trim());
      return;
    }

    // --- LANGKAH 8: sesi baru atau kedaluwarsa ------------------------------
    const kedaluwarsa = !sesi.expiresAt || sesi.expiresAt < new Date();
    if (kedaluwarsa || sesi.state === "idle") {
      await this.kirimMenuUtama(contact, sesi, { sapa: true });
      return;
    }

    // --- LANGKAH 8b: penilaian layanan -------------------------------------
    //
    // Diperiksa SEBELUM pencocokan menu di bawah: dalam keadaan ini angka
    // 1-5 berarti skor kepuasan, bukan nomor menu.
    //
    // Sengaja diletakkan SESUDAH pagar kedaluwarsa, berbeda dari LANGKAH 7b.
    // Penilaian ditanyakan segera setelah percakapan selesai dan wajar dijawab
    // dalam hitungan menit; warga yang baru membalas berjam-jam kemudian
    // sedang memulai urusan baru, dan angka "1" darinya jauh lebih mungkin
    // berarti menu 1 daripada "sangat tidak puas".
    if (sesi.state === STATE_MENUNGGU_SKOR) {
      await this.terimaSkor(contact, sesi, bersih);
      return;
    }

    if (sesi.state === STATE_MENUNGGU_KOMENTAR) {
      await this.terimaKomentar(contact, sesi, teks.trim(), bersih);
      return;
    }

    // --- LANGKAH 9: pilihan menu -------------------------------------------
    // Balasan List Message NOWEB berisi judul baris, misalnya
    // "3. Konsultasi statistik (ViDCon)". Angka manual tetap diterima agar
    // bot tidak bergantung pada komponen interaktif yang menurut dokumentasi
    // WAHA dapat sewaktu-waktu tidak dirender oleh WhatsApp.
    const pilihanMenu = bersih.match(/^([1-9][0-9]?)(?:\.|\s|$)/)?.[1] ?? null;
    if (sesi.state === "main_menu" && pilihanMenu) {
      const terjawab = await this.jawabMenu(contact, sesi, pilihanMenu);
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
      ? `${await ambilPesan("sapaan")}\n\n${await ambilPesan("menu_intro")}`
      : await ambilPesan("menu_intro_ulang");

    const [footer, judulInteraktif, tombolInteraktif, bagianInteraktif] =
      await Promise.all([
        ambilPesan("menu_footer"),
        ambilPesan("interaktif_menu_judul"),
        ambilPesan("interaktif_menu_tombol"),
        ambilPesan("interaktif_menu_bagian"),
      ]);

    await this.gateway.queueMenu(
      contact.id,
      contact.waId,
      header,
      [...baris, "", footer],
      {
        source: "bot",
        interactive: {
          title: judulInteraktif,
          button: tombolInteraktif,
          sectionTitle: bagianInteraktif,
        },
      }
    );

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

    // Menu yang membuka formulir (ViDCon, permintaan data, pengaduan).
    // Baris pertama jawaban menandai jenisnya; sisanya (kalau ada) jadi
    // sapaan pembuka kustom - admin tetap bisa menyunting kata-katanya
    // dari panel tanpa menyentuh kode.
    const cocokForm = entri.answer.trim().match(/^\[FORM:(vidcon|pengaduan|data)\]\s*([\s\S]*)$/);
    if (cocokForm) {
      const jenis = cocokForm[1] as JenisForm;
      const introKustom = cocokForm[2].trim();
      await this.mulaiForm(contact, sesi, jenis, introKustom || undefined);
      return true;
    }

    /*
     * Menu yang isinya diambil langsung dari Web API resmi BPS - publikasi
     * terbaru dan tabel statistik. Pola penandanya sama dengan [ESKALASI]
     * dan [FORM:...] di atas, jadi admin bisa memindah atau menonaktifkan
     * menunya dari panel tanpa menyentuh kode.
     *
     * pesanPublikasi()/pesanTabelStatistik() SELALU mengembalikan jawaban
     * yang berguna - kalau API tidak bisa dihubungi, yang dikirim tautan
     * resmi berikut penjelasannya. Jadi tidak perlu cabang kegagalan di sini.
     */
    const cocokBps = entri.answer.trim().match(/^\[BPS:(publikasi|tabel)\]/);
    if (cocokBps) {
      const isi =
        cocokBps[1] === "publikasi" ? await pesanPublikasi() : await pesanTabelStatistik();
      await this.balas(contact, isi, "faq");
      await this.gateway.queueText(
        contact.id,
        contact.waId,
        await ambilPesan("menu_footer_jawaban"),
        { source: "bot", delaySeconds: 4 }
      );
      await this.sentuhSesi(sesi.id);
      return true;
    }

    await this.balas(contact, entri.answer, "faq");

    // Menu dikirim ulang di bawah jawaban, dengan jeda bertingkat supaya
    // urutan sampainya benar dan terlihat wajar.
    await this.gateway.queueText(
      contact.id,
      contact.waId,
      await ambilPesan("menu_footer_jawaban"),
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

    await this.balas(contact, await ambilPesan("tidak_paham"), "bot");

    await db
      .update(beregamSessions)
      .set({ missCount: miss })
      .where(eq(beregamSessions.id, sesi.id));

    await this.sentuhSesi(sesi.id);
  }

  /**
   * Melempar percakapan ke petugas.
   *
   * DUA JALUR BERBEDA, tergantung jam kerja - ini yang memperbaiki keluhan
   * warga "macet" setelah minta bicara petugas di luar jam layanan.
   *
   * SEBELUMNYA: mode langsung dikunci "manual" tidak peduli jam berapa.
   * Itu benar SELAMA petugas memang akan segera membaca - dalam jam kerja
   * itu wajar. Di luar jam kerja, tidak ada yang akan membaca sampai besok,
   * tapi bot tetap terkunci diam sampai `manualModeTimeoutMinutes` (bawaan
   * 2 jam) habis. Warga yang mencoba lagi menit berikutnya menemukan bot
   * seolah mati - padahal itu justru mekanisme anti-balasan-dobel yang
   * bekerja sesuai rancangan, hanya saja diterapkan di waktu yang salah.
   *
   * SEKARANG, di luar jam kerja: mode TETAP "bot" (tidak dikunci). Warga
   * diminta menuliskan keperluannya, itu ditampung sebagai keterangan
   * handover, lalu bot kembali normal - bisa dipakai lagi seketika. Aman
   * dari balasan dobel karena mekanisme J1/J3 di webhook (lihat "fromMe")
   * berjalan independen: begitu petugas benar-benar membalas dari HP,
   * sesi otomatis terkunci manual saat itu juga, bukan lebih awal.
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

    const diLuarJam = !(await this.isJamLayanan());
    // Nomor bisa kosong pada pengalamatan LID - jangan menampilkan "+" sendirian
    // yang terlihat seperti nomor rusak. Lihat src/lib/beregam/identitas.ts.
    const nomor = contact.phone ? `+${contact.phone}` : "(nomor tidak terbaca, balas lewat inbox PESTA)";
    const waktu = formatWib(new Date());

    if (diLuarJam) {
      const sekarang = new Date();
      await db
        .update(beregamSessions)
        .set({ state: STATE_MENUNGGU_KONTEKS, lastActivityAt: sekarang })
        .where(eq(beregamSessions.contactId, contact.id));

      await this.notifyStaff(
        `🔔 *Permintaan bicara dengan petugas* (di luar jam layanan)\n\n` +
          `Nomor: ${nomor}\nWaktu: ${waktu} WIB\nAlasan awal: ${alasan}\n\n` +
          "Pengunjung sedang diminta menuliskan keperluannya. Notifikasi " +
          "susulan menyusul begitu mereka membalas."
      );

      await this.balas(
        contact,
        await ambilPesan("eskalasi_luar_jam", { jam_layanan: deskripsiJamLayanan() }),
        "bot"
      );

      console.info(
        `[beregam] eskalasi (luar jam) kontak=${samarkanNomor(contact.phone)} alasan="${alasan}"`
      );
      return;
    }

    // --- Dalam jam kerja: alur semula - kunci manual, staf memang segera baca ---
    await db
      .update(beregamSessions)
      .set({ mode: "manual", state: "manual", lastActivityAt: new Date() })
      .where(eq(beregamSessions.contactId, contact.id));

    await this.notifyStaff(
      `🔔 *Permintaan bicara dengan petugas*\n\n` +
        `Nomor: ${nomor}\nWaktu: ${waktu} WIB\nAlasan: ${alasan}\n\n` +
        "Silakan buka WhatsApp Beregam untuk membalas warga tersebut."
    );

    await this.balas(contact, await ambilPesan("eskalasi_jam_kerja"), "bot");

    console.info(
      `[beregam] eskalasi kontak=${samarkanNomor(contact.phone)} alasan="${alasan}"`
    );
  }

  /**
   * Menampung keterangan yang dituliskan warga saat eskalasi di luar jam
   * kerja, lalu mengembalikan bot ke keadaan normal.
   *
   * Dipanggil dari LANGKAH 7b handleIncoming, untuk sesi berstatus
   * STATE_MENUNGGU_KONTEKS.
   */
  private async terimaKonteksEskalasi(
    contact: BeregamContact,
    sesi: BeregamSession,
    keterangan: string
  ): Promise<void> {
    if (!keterangan) {
      // Pesan tanpa teks yang lolos sampai sini (mis. cuma emoji yang
      // terbuang saat normalisasi) - diminta lagi, bukan diperlakukan
      // sebagai keterangan kosong yang tidak berguna bagi petugas.
      await this.balas(contact, await ambilPesan("eskalasi_minta_ulang"), "bot");
      return;
    }

    await db
      .update(beregamHandovers)
      .set({ reason: keterangan.slice(0, 150) })
      .where(
        and(eq(beregamHandovers.contactId, contact.id), eq(beregamHandovers.status, "open"))
      );

    await this.notifyStaff(
      `📝 *Keterangan dari pengunjung* (di luar jam layanan)\n\n` +
        `Nomor: ${contact.phone ? `+${contact.phone}` : "(tidak terbaca, balas lewat inbox PESTA)"}\n` +
          `Pesan: "${keterangan.slice(0, 300)}"\n\n` +
        "Balas langsung dari WhatsApp Beregam kalau dirasa penting, atau " +
        "tunggu sampai jam kerja berikutnya."
    );

    await this.balas(
      contact,
      await ambilPesan("eskalasi_terima_konteks", { jam_layanan: deskripsiJamLayanan() }),
      "bot"
    );

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

  // =========================================================================
  // Formulir layanan langsung di chat (ViDCon, pengaduan, permintaan data)
  // =========================================================================

  /**
   * Membuka formulir: kirim SATU pesan berisi formatnya, lalu tunggu.
   *
   * Sapaan dan format digabung jadi satu pesan, bukan dua. Tiap balasan bot
   * memakan jatah pembatas laju, dan jatah itu jauh lebih berguna disimpan
   * untuk membantu warga memperbaiki isian yang keliru nanti.
   */
  private async mulaiForm(
    contact: BeregamContact,
    sesi: BeregamSession,
    jenis: JenisForm,
    introKustom?: string
  ): Promise<void> {
    const sekarang = new Date();
    await db
      .update(beregamSessions)
      .set({
        state: STATE_FORM,
        context: { form: jenis, jawaban: {} },
        missCount: 0,
        lastActivityAt: sekarang,
        expiresAt: tambahMenit(getConfig().sessionTtlMinutes, sekarang),
      })
      .where(eq(beregamSessions.id, sesi.id));

    const format = teksFormat(jenis);
    await this.balas(contact, introKustom ? `${introKustom}\n\n${format}` : format, "bot");
  }

  /**
   * Menerima formulir yang sudah diisi warga - seluruhnya dalam satu pesan.
   *
   * Isian yang sudah benar DIINGAT di context, jadi kalau ada yang keliru
   * warga cukup mengirim baris itu saja. Mengetik ulang sepuluh baris hanya
   * karena satu tanggal salah format adalah cara tercepat membuat orang
   * menyerah di tengah jalan.
   *
   * Kata kunci global (menu/batal/petugas) diperiksa lebih dulu di
   * handleIncoming, jadi jalan keluarnya selalu tersedia.
   */
  private async lanjutkanForm(
    contact: BeregamContact,
    sesi: BeregamSession,
    teks: string
  ): Promise<void> {
    const konteks = (sesi.context ?? {}) as {
      form?: JenisForm;
      jawaban?: Record<string, string>;
    };
    const jenis = konteks.form;

    // Context rusak atau hilang (mis. sesi dibuat ulang manual) - jangan
    // biarkan warga macet, kembalikan saja ke menu.
    if (!jenis || !MEDAN_FORM[jenis]) {
      await this.kirimMenuUtama(contact, { ...sesi, state: "main_menu" }, { sapa: false });
      return;
    }

    const tersimpan = konteks.jawaban ?? {};
    const { jawaban, masalah, adaLabelDikenali } = periksaForm(jenis, teks, tersimpan, contact);
    const sekarang = new Date();

    // Balasan yang sama sekali tidak memakai format - kemungkinan besar warga
    // mengetik bebas karena belum paham. Kirim ulang formatnya sekali, jangan
    // memarahi.
    if (!adaLabelDikenali) {
      await this.balas(
        contact,
        "Sepertinya formulirnya belum terisi sesuai format 🙏\n\n" +
          "Salin pesan format di bawah ini, lengkapi setelah tanda titik dua, lalu kirim " +
          "kembali dalam satu pesan.\n\n" +
          `${teksFormat(jenis)}`,
        "bot"
      );
      await this.sentuhSesi(sesi.id);
      return;
    }

    if (masalah.length > 0) {
      await db
        .update(beregamSessions)
        .set({
          context: { form: jenis, jawaban },
          lastActivityAt: sekarang,
          expiresAt: tambahMenit(getConfig().sessionTtlMinutes, sekarang),
        })
        .where(eq(beregamSessions.id, sesi.id));

      await this.balas(contact, pesanMasalah(masalah), "bot");
      return;
    }

    try {
      const { id, pesan } = await submitForm(jenis, jawaban);
      await this.balas(contact, pesan, "bot");
      console.info(
        `[beregam] formulir ${jenis} #${id} dari kontak=${samarkanNomor(contact.phone)}`
      );
    } catch (error) {
      console.error(`[beregam] gagal menyimpan formulir ${jenis}:`, error);
      await this.balas(
        contact,
        "Mohon maaf, terjadi kendala teknis saat menyimpan formulir Anda. " +
          "Silakan coba lagi beberapa saat, atau ketik *petugas* untuk dibantu langsung.",
        "bot"
      );
    }

    await db
      .update(beregamSessions)
      .set({
        state: "main_menu",
        context: null,
        missCount: 0,
        lastActivityAt: sekarang,
        expiresAt: tambahMenit(getConfig().sessionTtlMinutes, sekarang),
      })
      .where(eq(beregamSessions.id, sesi.id));
  }

  // =========================================================================
  // Penilaian layanan
  // =========================================================================

  /**
   * Menanyakan penilaian, dipanggil saat petugas menandai percakapan selesai.
   *
   * Ditanyakan SEKARANG, bukan lewat survei terpisah nanti: pengalamannya
   * masih segar, dan warga sudah ada di percakapan yang sama - tidak perlu
   * membuka tautan apa pun.
   *
   * Dilewati diam-diam bila warga sudah menyatakan berhenti, sedang diblokir,
   * atau saklar bot sedang dimatikan. Pertanyaan kepuasan tetaplah pesan
   * otomatis; aturan yang berlaku untuk pesan otomatis lain berlaku juga di
   * sini.
   */
  async mintaPenilaian(contact: BeregamContact, handoverId: number | null): Promise<void> {
    if (contact.optedOutAt || contact.isBlocked) return;

    const health = await ambilHealth();
    if (!health.botEnabled) return;

    const sesi = await ambilAtauBuatSesi(contact.id);
    const sekarang = new Date();

    await db
      .update(beregamSessions)
      .set({
        mode: "bot",
        state: STATE_MENUNGGU_SKOR,
        // handoverId dititipkan di context supaya penilaiannya bisa
        // dihubungkan ke percakapan yang benar saat warga membalas nanti.
        context: { handoverId },
        missCount: 0,
        lastActivityAt: sekarang,
        expiresAt: tambahMenit(getConfig().sessionTtlMinutes, sekarang),
      })
      .where(eq(beregamSessions.id, sesi.id));

    const [pesanPenilaian, judul, tombol, bagian, footer] = await Promise.all([
      ambilPesan("penilaian_minta"),
      ambilPesan("interaktif_penilaian_judul"),
      ambilPesan("interaktif_penilaian_tombol"),
      ambilPesan("interaktif_penilaian_bagian"),
      ambilPesan("interaktif_penilaian_footer"),
    ]);

    await this.gateway.queueMenu(
      contact.id,
      contact.waId,
      pesanPenilaian,
      [
        "5. Sangat puas",
        "4. Puas",
        "3. Cukup",
        "2. Kurang puas",
        "1. Tidak puas",
        "",
        "Ketik lewati bila sedang tidak sempat.",
      ],
      {
        source: "bot",
        interactive: {
          title: judul,
          button: tombol,
          sectionTitle: bagian,
          footer,
          // Pilihan skor berada di balik tombol daftar. Naskah ini sengaja
          // dipakai langsung agar skala 1-5 tidak tercetak dua kali seperti
          // pada implementasi awal List Message.
          description: pesanPenilaian,
        },
      }
    );
  }

  /** Menerima angka 1-5. Balasan lain memulangkan warga ke menu, bukan menahannya. */
  private async terimaSkor(
    contact: BeregamContact,
    sesi: BeregamSession,
    bersih: string
  ): Promise<void> {
    if (KATA_LEWATI.includes(bersih)) {
      await this.selesaikanPenilaian(contact, sesi, "penilaian_dilewati");
      return;
    }

    const pilihanSkor = bersih.match(/^([1-5])(?:\.|\s|$)/)?.[1] ?? bersih;
    const skor = Number(pilihanSkor);
    if (!Number.isInteger(skor) || skor < 1 || skor > 5) {
      /*
       * Bukan angka 1-5, dan bukan kata melewati.
       *
       * TIDAK diminta ulang. Warga yang membalas hal lain di sini sedang
       * memulai urusan baru, bukan salah mengetik - menahannya dalam
       * pertanyaan kepuasan sampai ia menjawab benar akan mengubah ajakan
       * memberi masukan menjadi penghalang. Penilaiannya dilewati diam-diam
       * dan pesannya diperlakukan seperti pesan biasa.
       */
      await db
        .update(beregamSessions)
        .set({ state: "main_menu", context: null })
        .where(eq(beregamSessions.id, sesi.id));

      await this.kirimMenuUtama(contact, { ...sesi, state: "main_menu" }, { sapa: false });
      return;
    }

    const konteks = (sesi.context ?? {}) as { handoverId?: number | null };
    const handoverId = konteks.handoverId ?? null;

    // Petugas yang menangani diambil dari handover-nya, supaya penilaian bisa
    // dilaporkan per petugas tanpa menanyakannya ke warga.
    let ditanganiOleh: number | null = null;
    if (handoverId) {
      const [h] = await db
        .select({ assignedTo: beregamHandovers.assignedTo })
        .from(beregamHandovers)
        .where(eq(beregamHandovers.id, handoverId))
        .limit(1);
      ditanganiOleh = h?.assignedTo ?? null;
    }

    const [dibuat] = await db
      .insert(beregamPenilaian)
      .values({ contactId: contact.id, handoverId, skor, ditanganiOleh })
      .$returningId();

    const sekarang = new Date();
    await db
      .update(beregamSessions)
      .set({
        state: STATE_MENUNGGU_KOMENTAR,
        context: { penilaianId: dibuat.id },
        lastActivityAt: sekarang,
        expiresAt: tambahMenit(getConfig().sessionTtlMinutes, sekarang),
      })
      .where(eq(beregamSessions.id, sesi.id));

    await this.balas(
      contact,
      await ambilPesan("penilaian_terima", { skor: String(skor) }),
      "bot"
    );

    console.info(
      `[beregam] penilaian ${skor}/5 dari kontak=${samarkanNomor(contact.phone)}`
    );
  }

  /** Menerima masukan tertulis yang sifatnya opsional. */
  private async terimaKomentar(
    contact: BeregamContact,
    sesi: BeregamSession,
    teks: string,
    bersih: string
  ): Promise<void> {
    if (KATA_LEWATI.includes(bersih) || !teks) {
      await this.selesaikanPenilaian(contact, sesi, "penilaian_dilewati");
      return;
    }

    const konteks = (sesi.context ?? {}) as { penilaianId?: number };
    if (konteks.penilaianId) {
      await db
        .update(beregamPenilaian)
        .set({ komentar: teks.slice(0, 2000) })
        .where(eq(beregamPenilaian.id, konteks.penilaianId));
    }

    await this.selesaikanPenilaian(contact, sesi, "penilaian_terima_komentar");
  }

  /** Menutup alur penilaian dan mengembalikan sesi ke keadaan normal. */
  private async selesaikanPenilaian(
    contact: BeregamContact,
    sesi: BeregamSession,
    kunciPesan: "penilaian_dilewati" | "penilaian_terima_komentar"
  ): Promise<void> {
    await this.balas(contact, await ambilPesan(kunciPesan), "bot");

    const sekarang = new Date();
    await db
      .update(beregamSessions)
      .set({
        state: "main_menu",
        context: null,
        missCount: 0,
        lastActivityAt: sekarang,
        expiresAt: tambahMenit(getConfig().sessionTtlMinutes, sekarang),
      })
      .where(eq(beregamSessions.id, sesi.id));
  }

  /**
   * Mengirim notifikasi ke WA petugas piket (BEREGAM_STAFF_WA).
   *
   * Nomor petugas sengaja BERBEDA dari nomor bot (6285169881015). Notifikasi
   * ini murni pemberitahuan "ada yang perlu ditindaklanjuti" - petugas
   * tetap membalas WARGA dari HP yang memegang nomor bot, bukan dari nomor
   * penerima notifikasi ini. Membalas dari nomor yang salah membuat
   * balasannya tidak tercatat sebagai `agent_phone` dan warga menerima
   * pesan dari nomor asing yang tidak mereka kenal.
   *
   * Gagal diam-diam bila BEREGAM_STAFF_WA belum diisi - modul tetap
   * berfungsi tanpa nomor ini, hanya notifikasinya yang tidak terkirim.
   */
  private async notifyStaff(teks: string): Promise<void> {
    await kirimNotifikasiPetugas(teks);
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

    await this.balas(contact, await ambilPesan("bukan_teks", { jenis: sebutan }), "bot");

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
