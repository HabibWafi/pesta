#!/usr/bin/env node
/**
 * Uji ujung-ke-ujung modul Beregam terhadap server pengembangan.
 *
 * Mensimulasikan engine WhatsApp: menandatangani payload dengan HMAC yang
 * sama seperti OpenWA nanti, lalu memeriksa apa yang benar-benar masuk ke
 * database.
 */

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const B = process.env.BASE || "http://localhost:3000";
const MYSQL = "C:/laragon/bin/mysql/mysql-8.0.30-winx64/bin/mysql.exe";

const env = Object.fromEntries(
  readFileSync("D:/Aplikasi dan Website/pesta/.env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const API_KEY = env.BEREGAM_API_KEY;
const HMAC = env.BEREGAM_WEBHOOK_HMAC;
const NOMOR = "6281299887766@c.us";

let gagal = 0;
function lapor(nama, lulus, ket = "") {
  console.log(`  ${lulus ? "LULUS" : "GAGAL"}  ${nama}${ket ? `  (${ket})` : ""}`);
  if (!lulus) gagal += 1;
}

function sql(q) {
  return execFileSync(MYSQL, ["-u", "root", "--skip-column-names", "-e", q], {
    encoding: "utf8",
  }).trim();
}

let nomorPesan = 0;
function pesanWa(body, opsi = {}) {
  nomorPesan += 1;
  return {
    event: "message",
    session: "default",
    payload: {
      id: opsi.id ?? `UJI_${Date.now()}_${nomorPesan}`,
      from: opsi.from ?? NOMOR,
      fromMe: opsi.fromMe ?? false,
      body,
      type: opsi.type ?? "text",
      timestamp: Math.floor((opsi.waktuMs ?? Date.now()) / 1000),
      // pushName sengaja bisa DIHILANGKAN: payload LID sungguhan dari WAHA
      // tidak punya pushName di tingkat atas sama sekali - hanya di dalam
      // _data. Itulah sebabnya seluruh kontak LID di produksi tersimpan
      // tanpa nama.
      ...(opsi.tanpaPushName ? {} : { pushName: opsi.pushName ?? "Warga Uji" }),
      ...(opsi.data ? { _data: opsi.data } : {}),
    },
  };
}

/**
 * Pesan dengan pengalamatan LID - bentuk yang benar-benar dikirim WhatsApp
 * sekarang, disalin dari payload asli di produksi.
 *
 * `from` berupa angka LID yang BUKAN nomor telepon; nomor sungguhannya ada
 * di _data.key.remoteJidAlt, dan nama profilnya di _data.pushName.
 */
function pesanWaLid(body, lid, nomorSungguhan, nama = "Warga Uji LID") {
  return pesanWa(body, {
    from: `${lid}@lid`,
    tanpaPushName: true,
    data: {
      key: {
        remoteJid: `${lid}@lid`,
        remoteJidAlt: `${nomorSungguhan}@s.whatsapp.net`,
        fromMe: false,
        addressingMode: "lid",
      },
      pushName: nama,
    },
  });
}

async function webhook(payload, opsi = {}) {
  const raw = JSON.stringify(payload);
  const tanda = opsi.hmacSalah
    ? "0".repeat(128)
    : createHmac("sha512", HMAC).update(raw, "utf8").digest("hex");

  const res = await fetch(`${B}/api/beregam/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-hmac": tanda },
    body: raw,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function worker(path, opsi = {}) {
  const res = await fetch(`${B}/api/beregam${path}`, {
    method: opsi.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opsi.tanpaKunci ? {} : { "x-beregam-key": API_KEY }),
      "x-worker-id": opsi.workerId ?? "uji-worker",
      ...(opsi.versi ? { "x-contracts-version": opsi.versi } : {}),
    },
    ...(opsi.body ? { body: JSON.stringify(opsi.body) } : {}),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

function bersihkan() {
  sql(`DELETE FROM pesta.beregam_contacts WHERE wa_id='${NOMOR}';`);
  sql(`DELETE FROM pesta.beregam_alerts WHERE 1=1;`);
  // Formulir layanan lewat chat (bagian O) - tidak berelasi FK ke
  // beregam_contacts, jadi harus dibersihkan terpisah lewat nama uji.
  sql(`DELETE FROM pesta.vidcon_requests WHERE nama LIKE 'Warga Uji ViDCon%';`);
  sql(`DELETE FROM pesta.pengaduans WHERE nama = 'Warga Uji Aduan WA';`);
  sql(`DELETE FROM pesta.permintaan_data WHERE nama LIKE 'Warga Uji Data%';`);
  // Hari libur palsu dari uji eskalasi luar jam kerja (bagian M) - dibersihkan
  // di sini juga sebagai jaring pengaman kalau uji sebelumnya berhenti paksa.
  sql(`DELETE FROM pesta.beregam_holidays WHERE nama='Uji - hari libur palsu';`);
  // Reset gerbang pemeliharaan supaya uji bisa dijalankan berulang tanpa
  // harus menunggu 60 detik dari jalannya yang terakhir.
  sql(`UPDATE pesta.beregam_health SET maintenance_ran_at=NULL, active_worker_id=NULL, lease_expires_at=NULL, bot_enabled=1 WHERE id=1;`);
}

const jeda = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\nUji Beregam terhadap ${B}\n`);
  bersihkan();

  // === A. Keamanan ========================================================
  console.log("A. KEAMANAN");
  lapor("webhook HMAC salah ditolak 401", (await webhook(pesanWa("halo"), { hmacSalah: true })).status === 401);
  lapor("outbox tanpa kunci API ditolak 401", (await worker("/outbox", { tanpaKunci: true })).status === 401);
  lapor("heartbeat tanpa kunci API ditolak 401", (await worker("/heartbeat", { method: "POST", tanpaKunci: true, body: { workerId: "x" } })).status === 401);

  const versiSalah = await worker("/outbox", { versi: "0.9.0" });
  lapor("versi kontrak lama ditolak 409", versiSalah.status === 409, versiSalah.body?.message?.slice(0, 60));
  const hTanpaKunci = await fetch(`${B}/api/beregam/health`);
  lapor("health TANPA kunci API tetap bisa diakses", hTanpaKunci.status !== 401 && hTanpaKunci.status !== 403, `status ${hTanpaKunci.status}`);

  // === B. Penyaringan webhook =============================================
  console.log("\nB. PENYARINGAN WEBHOOK");
  const grup = await webhook(pesanWa("halo", { from: "62812@g.us" }));
  lapor("pesan grup diabaikan, tetap 200", grup.status === 200 && grup.body.diabaikan === "pesan grup");

  const broadcast = await webhook(pesanWa("halo", { from: "status@broadcast" }));
  lapor("status broadcast diabaikan", broadcast.status === 200 && broadcast.body.diabaikan === "status broadcast");

  const idSama = `DUPLIKAT_${Date.now()}`;
  await webhook(pesanWa("halo", { id: idSama }));
  await jeda(300);
  const kedua = await webhook(pesanWa("halo", { id: idSama }));
  lapor("pesan duplikat tidak disimpan dua kali", kedua.body.diabaikan === "duplikat");
  lapor("  jumlah baris di database = 1", sql(`SELECT COUNT(*) FROM pesta.beregam_messages WHERE wa_message_id='${idSama}';`) === "1");

  // === C. Alur percakapan =================================================
  console.log("\nC. ALUR PERCAKAPAN");
  await jeda(400);
  const kontakId = sql(`SELECT id FROM pesta.beregam_contacts WHERE wa_id='${NOMOR}';`);
  lapor("kontak dibuat otomatis", Boolean(kontakId), `id=${kontakId}`);

  const antre1 = sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`);
  lapor("sapaan + menu diantrekan", Number(antre1) > 0, `${antre1} baris`);

  const isiMenu = sql(`SELECT payload FROM pesta.beregam_outbox WHERE contact_id=${kontakId} ORDER BY id LIMIT 1;`);
  lapor("  menu memuat pilihan petugas", isiMenu.includes("Bicara dengan petugas"));

  // Sapaan pertama tidak boleh terjadwal beberapa detik ke depan. Sempat
  // begitu: PESTA menunda jadwalnya sendiri (jedaAcakDetik, 3-8 detik) DI
  // ATAS jeda "mengetik" yang sudah dikerjakan worker - dobel, dan tidak
  // menunjukkan indikator apa pun ke warga selama jeda pertama itu.
  const detikTerjadwal = Number(
    sql(`SELECT TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(3), scheduled_at) FROM pesta.beregam_outbox WHERE contact_id=${kontakId} ORDER BY id LIMIT 1;`)
  );
  lapor(
    "  sapaan tidak dobel-jeda (scheduled_at <= sekarang)",
    detikTerjadwal <= 1,
    `${detikTerjadwal} detik ke depan`
  );

  // Pilih menu 1
  await webhook(pesanWa("1"));
  await jeda(400);
  const adaJamLayanan = sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId} AND payload LIKE '%Jam Layanan%';`);
  lapor("menu 1 menjawab jam layanan", Number(adaJamLayanan) > 0);

  // === D. UJI TERPENTING: mode manual =====================================
  console.log("\nD. MODE MANUAL - bot harus DIAM TOTAL");
  sql(`UPDATE pesta.beregam_sessions SET mode='manual' WHERE contact_id=${kontakId};`);
  const sebelum = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`));

  await webhook(pesanWa("halo apa kabar"));
  await webhook(pesanWa("menu"));
  await webhook(pesanWa("1"));
  await jeda(600);

  const sesudah = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`));
  lapor("tiga pesan masuk saat mode manual -> NOL balasan", sesudah === sebelum, `${sebelum} -> ${sesudah}`);
  lapor("  pesan tetap dicatat untuk inbox petugas", Number(sql(`SELECT COUNT(*) FROM pesta.beregam_messages WHERE contact_id=${kontakId} AND direction='in';`)) >= 4);
  lapor("  'menu' saat manual TIDAK melepas mode", sql(`SELECT mode FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "manual");

  sql(`UPDATE pesta.beregam_sessions SET mode='bot', state='main_menu' WHERE contact_id=${kontakId};`);

  // === E. Pagar pesan basi ================================================
  console.log("\nE. PAGAR PESAN BASI (pemulihan setelah PC mati)");
  const sblmBasi = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`));
  await webhook(pesanWa("1", { waktuMs: Date.now() - 60 * 60 * 1000 }));
  await jeda(400);
  const ssdhBasi = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`));
  lapor("pesan berumur 1 jam dicatat tapi TIDAK dibalas", ssdhBasi === sblmBasi, `${sblmBasi} -> ${ssdhBasi}`);

  // === F. Balasan admin dari HP (fromMe) ==================================
  console.log("\nF. BALASAN ADMIN DARI HP");
  await webhook(pesanWa("Baik pak, kami bantu ya", { fromMe: true }));
  await jeda(400);
  const agentPhone = sql(`SELECT COUNT(*) FROM pesta.beregam_messages WHERE contact_id=${kontakId} AND source='agent_phone';`);
  lapor("balasan dari HP tercatat sebagai agent_phone", agentPhone === "1");
  lapor("  sesi otomatis jadi manual (bot tidak merebut)", sql(`SELECT mode FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "manual");

  sql(`UPDATE pesta.beregam_sessions SET mode='bot' WHERE contact_id=${kontakId};`);

  // === G. Opt-out =========================================================
  console.log("\nG. WARGA MENYATAKAN BERHENTI");
  await webhook(pesanWa("STOP"));
  await jeda(400);
  lapor("opted_out_at terisi", sql(`SELECT COUNT(*) FROM pesta.beregam_contacts WHERE id=${kontakId} AND opted_out_at IS NOT NULL;`) === "1");

  const sblmDiam = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`));
  await webhook(pesanWa("halo lagi"));
  await jeda(400);
  lapor("setelah berhenti, bot diam total", Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`)) === sblmDiam);
  sql(`UPDATE pesta.beregam_contacts SET opted_out_at=NULL WHERE id=${kontakId};`);

  // === H. Pesan bukan teks ================================================
  console.log("\nH. PESAN BUKAN TEKS");
  await webhook(pesanWa("", { type: "image" }));
  await jeda(400);
  lapor("foto dibalas ramah, bukan dianggap salah", Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId} AND payload LIKE '%bisa membaca%';`)) > 0);
  lapor("  hitungan 'tidak paham' tidak naik", sql(`SELECT miss_count FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "0");

  await webhook(pesanWa("", { type: "ptt" }));
  await jeda(400);
  lapor("voice note langsung dieskalasi ke petugas", Number(sql(`SELECT COUNT(*) FROM pesta.beregam_handovers WHERE contact_id=${kontakId};`)) > 0);
  sql(`UPDATE pesta.beregam_sessions SET mode='bot', state='main_menu' WHERE contact_id=${kontakId};`);

  // === I. Penguncian outbox ===============================================
  console.log("\nI. PENGUNCIAN OUTBOX");
  sql(`UPDATE pesta.beregam_outbox SET status='pending', scheduled_at=UTC_TIMESTAMP(3) WHERE contact_id=${kontakId};`);
  const a = await worker("/outbox?limit=5", { workerId: "worker-A" });
  const b = await worker("/outbox?limit=5", { workerId: "worker-B" });
  const idA = (a.body.items ?? []).map((i) => i.id);
  const idB = (b.body.items ?? []).map((i) => i.id);
  lapor("worker A mendapat antrean", idA.length > 0, `${idA.length} item`);
  lapor("worker B TIDAK mendapat item yang sama", idB.filter((i) => idA.includes(i)).length === 0);

  // Antrean tanpa jadwal berarti "kirim secepatnya", dan harus ikut terjemput.
  //
  // Uji ini ada karena kasusnya pernah lolos: uji di atas selalu mengisi
  // scheduled_at, sehingga cabang NULL tidak pernah tersentuh. Di SQL,
  // `NULL <= sekarang` bernilai NULL - bukan benar - jadi barisnya diam di
  // status pending selamanya tanpa galat, tanpa percobaan ulang, tanpa jejak
  // di log. Warga menunggu balasan yang tidak akan pernah datang.
  sql(`UPDATE pesta.beregam_outbox SET status='pending', locked_by=NULL, locked_at=NULL, scheduled_at=NULL WHERE contact_id=${kontakId};`);
  // Wajib memakai worker-A: hanya pemegang sewa yang dilayani /outbox, jadi
  // worker lain akan dapat nol karena sewanya, bukan karena jadwalnya.
  const tanpaJadwal = await worker("/outbox?limit=5", { workerId: "worker-A" });
  lapor(
    "antrean tanpa scheduled_at tetap terjemput",
    ((tanpaJadwal.body.items ?? []).length) > 0,
    `${(tanpaJadwal.body.items ?? []).length} item`
  );

  // === J. Heartbeat & pemeliharaan ========================================
  console.log("\nJ. HEARTBEAT & PEMELIHARAAN");
  const hb1 = await worker("/heartbeat", { method: "POST", body: { workerId: "worker-A", waSessionStatus: "WORKING", uptime: 120 } });
  lapor("heartbeat diterima", hb1.status === 200);
  lapor("  pemeliharaan berjalan", hb1.body.maintenanceRan === true);
  lapor("  worker A memegang sewa", hb1.body.holdsLease === true);
  lapor("  saklar bot terbaca", hb1.body.botEnabled === true);

  const hb2 = await worker("/heartbeat", { method: "POST", body: { workerId: "worker-A", waSessionStatus: "WORKING" } });
  lapor("pemeliharaan TIDAK jalan dua kali dalam 60 detik", hb2.body.maintenanceRan === false);

  const hbB = await worker("/heartbeat", { method: "POST", body: { workerId: "worker-B", waSessionStatus: "WORKING" } });
  lapor("worker B tidak memegang sewa (cegah kirim dobel)", hbB.body.holdsLease === false);

  // === K. Saklar darurat ==================================================
  console.log("\nK. SAKLAR DARURAT");
  sql(`UPDATE pesta.beregam_health SET bot_enabled=0 WHERE id=1;`);
  const sblmSaklar = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`));
  await webhook(pesanWa("menu"));
  await jeda(400);
  lapor("bot_enabled=0 -> tidak ada balasan sama sekali", Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`)) === sblmSaklar);
  lapor("  outbox juga kosong untuk worker", ((await worker("/outbox")).body.items ?? []).length === 0);
  sql(`UPDATE pesta.beregam_health SET bot_enabled=1 WHERE id=1;`);

  // === L. Health & watchdog ===============================================
  console.log("\nL. HEALTH & WATCHDOG");
  const health = await fetch(`${B}/api/beregam/health`);
  const hBody = await health.json();
  lapor("health menjawab", [200, 503].includes(health.status), `status=${hBody.status}`);

  sql(`UPDATE pesta.beregam_health SET worker_last_seen_at = UTC_TIMESTAMP(3) - INTERVAL 30 MINUTE WHERE id=1;`);
  await fetch(`${B}/api/beregam/health`);
  await jeda(300);
  lapor("watchdog mendeteksi worker mati", Number(sql(`SELECT COUNT(*) FROM pesta.beregam_alerts WHERE kode='worker_mati' AND resolved_at IS NULL;`)) > 0);

  sql(`UPDATE pesta.beregam_health SET worker_last_seen_at = UTC_TIMESTAMP(3) WHERE id=1;`);
  await fetch(`${B}/api/beregam/health`);
  await jeda(300);
  lapor("  alert ditutup saat worker pulih", sql(`SELECT COUNT(*) FROM pesta.beregam_alerts WHERE kode='worker_mati' AND resolved_at IS NULL;`) === "0");

  // === M. Eskalasi di luar jam kerja ======================================
  //
  // Memaksa isJamLayanan() bernilai false TANPA bergantung pada jam nyata
  // saat uji ini kebetulan dijalankan: menandai hari ini sebagai hari libur.
  // isJamLayanan() memeriksa beregam_holidays setelah hari & jam kerja -
  // hari libur mengalahkan keduanya, apa pun jam sungguhannya sekarang.
  console.log("\nM. ESKALASI DI LUAR JAM KERJA");

  const tanggalWibHariIni = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  sql(`INSERT INTO pesta.beregam_holidays (tanggal, nama) VALUES ('${tanggalWibHariIni}', 'Uji - hari libur palsu') ON DUPLICATE KEY UPDATE nama=nama;`);
  sql(`UPDATE pesta.beregam_sessions SET mode='bot', state='main_menu' WHERE contact_id=${kontakId};`);
  // Bagian H (pesan suara) sudah membuka handover untuk kontak yang sama -
  // escalate() sengaja tidak pernah membuka dua handover terbuka sekaligus
  // untuk satu kontak, jadi harus diselesaikan dulu supaya bagian ini
  // menguji handover yang BENAR-BENAR baru, bukan sisa dari bagian H.
  sql(`UPDATE pesta.beregam_handovers SET status='resolved', resolved_at=UTC_TIMESTAMP(3) WHERE contact_id=${kontakId} AND status='open';`);

  await webhook(pesanWa("petugas"));
  await jeda(500);

  const modeSetelah = sql(`SELECT mode FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`);
  const stateSetelah = sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`);
  lapor("mode TIDAK terkunci manual di luar jam kerja", modeSetelah === "bot", `mode=${modeSetelah}`);
  lapor("state menunggu keterangan warga", stateSetelah === "awaiting_escalation_reason", `state=${stateSetelah}`);
  lapor(
    "handover terbuka dengan alasan awal",
    sql(`SELECT reason FROM pesta.beregam_handovers WHERE contact_id=${kontakId} AND status='open' ORDER BY id DESC LIMIT 1;`).includes("Diminta warga")
  );

  // Yang diperbaiki: warga TIDAK boleh macet. "menu" harus langsung dibalas
  // seketika, bukan menunggu manualModeTimeoutMinutes (bawaan 2 jam).
  const outboxSebelumMenu = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId} AND type='menu';`));
  await webhook(pesanWa("menu"));
  await jeda(500);
  lapor(
    "warga tidak macet - 'menu' tetap dibalas seketika",
    Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId} AND type='menu';`)) > outboxSebelumMenu
  );

  // Kembalikan ke keadaan menunggu konteks untuk menguji penangkapan alasan.
  sql(`UPDATE pesta.beregam_sessions SET state='awaiting_escalation_reason' WHERE contact_id=${kontakId};`);
  await webhook(pesanWa("Mau tanya jadwal ViDCon minggu depan, agak mendesak"));
  await jeda(500);

  lapor(
    "keterangan warga tersimpan di handover",
    sql(`SELECT reason FROM pesta.beregam_handovers WHERE contact_id=${kontakId} AND status='open' ORDER BY id DESC LIMIT 1;`).includes("jadwal ViDCon")
  );
  lapor(
    "sesi kembali dipakai normal setelah keterangan diberikan",
    sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "main_menu"
  );

  if (env.BEREGAM_STAFF_WA) {
    const nomorStaf = env.BEREGAM_STAFF_WA.replace(/[^0-9]/g, "");
    const jumlahNotifikasi = Number(
      sql(
        `SELECT COUNT(*) FROM pesta.beregam_outbox o JOIN pesta.beregam_contacts c ON c.id=o.contact_id WHERE c.phone='${nomorStaf}';`
      )
    );
    lapor("notifikasi terkirim ke WA petugas", jumlahNotifikasi >= 2, `${jumlahNotifikasi} notifikasi`);
    sql(`DELETE FROM pesta.beregam_contacts WHERE phone='${nomorStaf}';`);
  } else {
    console.log("  (BEREGAM_STAFF_WA belum diisi di .env - notifikasi petugas dilewati)");
  }

  sql(`DELETE FROM pesta.beregam_holidays WHERE tanggal='${tanggalWibHariIni}' AND nama='Uji - hari libur palsu';`);
  sql(`UPDATE pesta.beregam_sessions SET mode='bot', state='main_menu' WHERE contact_id=${kontakId};`);

  // === N. Penilaian layanan ================================================
  console.log("\nN. PENILAIAN LAYANAN");

  // Bot menanyakan penilaian saat petugas menandai selesai. Di uji ini
  // keadaannya disiapkan langsung, karena penandaan selesai lewat panel admin
  // butuh sesi login yang bukan cakupan uji ini.
  sql(`UPDATE pesta.beregam_sessions SET mode='bot', state='awaiting_rating_score', context='{"handoverId":null}', expires_at=UTC_TIMESTAMP(3) + INTERVAL 30 MINUTE WHERE contact_id=${kontakId};`);

  await webhook(pesanWa("5"));
  await jeda(500);

  lapor(
    "skor 1-5 tersimpan sebagai penilaian",
    sql(`SELECT skor FROM pesta.beregam_penilaian WHERE contact_id=${kontakId} ORDER BY id DESC LIMIT 1;`) === "5"
  );
  lapor(
    "  sesi lanjut menunggu masukan tertulis",
    sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "awaiting_rating_comment"
  );

  await webhook(pesanWa("Petugasnya ramah dan jawabannya jelas"));
  await jeda(500);

  lapor(
    "masukan tertulis tersimpan di penilaian yang sama",
    sql(`SELECT komentar FROM pesta.beregam_penilaian WHERE contact_id=${kontakId} ORDER BY id DESC LIMIT 1;`).includes("ramah")
  );
  lapor(
    "  sesi kembali normal setelah penilaian selesai",
    sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "main_menu"
  );

  // Warga yang membalas hal lain saat ditanya penilaian TIDAK boleh terjebak -
  // ini pagar yang sama dengan eskalasi luar jam kerja.
  sql(`UPDATE pesta.beregam_sessions SET state='awaiting_rating_score', context='{"handoverId":null}', expires_at=UTC_TIMESTAMP(3) + INTERVAL 30 MINUTE WHERE contact_id=${kontakId};`);
  const penilaianSebelum = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_penilaian WHERE contact_id=${kontakId};`));
  const menuSebelum = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId} AND type='menu';`));

  await webhook(pesanWa("saya mau tanya data penduduk"));
  await jeda(500);

  lapor(
    "balasan bukan angka TIDAK tersimpan sebagai penilaian",
    Number(sql(`SELECT COUNT(*) FROM pesta.beregam_penilaian WHERE contact_id=${kontakId};`)) === penilaianSebelum
  );
  lapor(
    "  warga tidak terjebak - langsung dikembalikan ke menu",
    Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId} AND type='menu';`)) > menuSebelum &&
      sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "main_menu"
  );

  // "lewati" menutup penilaian tanpa menyimpan apa pun.
  sql(`UPDATE pesta.beregam_sessions SET state='awaiting_rating_score', context='{"handoverId":null}', expires_at=UTC_TIMESTAMP(3) + INTERVAL 30 MINUTE WHERE contact_id=${kontakId};`);
  const sblmLewati = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_penilaian WHERE contact_id=${kontakId};`));
  await webhook(pesanWa("lewati"));
  await jeda(500);
  lapor(
    "'lewati' menutup penilaian tanpa menyimpan skor",
    Number(sql(`SELECT COUNT(*) FROM pesta.beregam_penilaian WHERE contact_id=${kontakId};`)) === sblmLewati &&
      sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "main_menu"
  );

  // Sebagian besar percakapan selesai di bot dan tidak pernah sampai ke
  // petugas. Kalau penilaian hanya bisa dibuka petugas, percakapan itu tidak
  // pernah ternilai sama sekali - karena itu ada kata kunci sendiri.
  await webhook(pesanWa("nilai"));
  await jeda(500);
  lapor(
    "kata kunci 'nilai' membuka penilaian tanpa perlu petugas",
    sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "awaiting_rating_score"
  );

  await webhook(pesanWa("4"));
  await jeda(500);
  lapor(
    "  skor dari jalur mandiri tersimpan tanpa handover",
    sql(`SELECT CONCAT(skor, '|', IFNULL(handover_id, 'null')) FROM pesta.beregam_penilaian WHERE contact_id=${kontakId} ORDER BY id DESC LIMIT 1;`) === "4|null"
  );

  await webhook(pesanWa("lewati"));
  await jeda(500);

  // === N2. Penilaian otomatis setelah idle di menu =========================
  console.log("\nN2. PENILAIAN OTOMATIS SETELAH IDLE DI MENU");

  // Sesi dibuat seolah sudah menganggur di menu lebih lama dari ambang
  // (bawaan 10 menit) - mensimulasikan warga yang membaca jawaban FAQ lalu
  // pergi tanpa membalas apa pun.
  sql(
    `UPDATE pesta.beregam_sessions SET mode='bot', state='main_menu', context=NULL, ` +
      `last_activity_at=UTC_TIMESTAMP(3) - INTERVAL 11 MINUTE WHERE contact_id=${kontakId};`
  );
  const outboxSebelumIdle = Number(
    sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`)
  );

  // Gerbang pemeliharaan dipaksa terbuka lagi supaya heartbeat berikut ini
  // BENAR-BENAR menjalankan runMaintenance(), bukan dilewati karena baru
  // saja jalan lewat webhook-webhook di atas.
  sql(`UPDATE pesta.beregam_health SET maintenance_ran_at=NULL WHERE id=1;`);
  await worker("/heartbeat", { method: "POST", body: { workerId: "worker-A", waSessionStatus: "WORKING" } });
  await jeda(500);

  lapor(
    "sesi menganggur di menu ditanya penilaian otomatis",
    sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "awaiting_rating_score"
  );
  lapor(
    "  pesan penilaian memuat tautan SKD resmi",
    sql(
      `SELECT payload->>'$.text' FROM pesta.beregam_outbox WHERE contact_id=${kontakId} ` +
        `ORDER BY id DESC LIMIT 1;`
    ).includes("skd.bps.go.id")
  );

  // Heartbeat kedua TIDAK boleh menanyakan penilaian sekali lagi - begitu
  // state berpindah dari main_menu, sesi ini tidak lagi terjaring query
  // idle-nya, walau last_activity_at masih tua.
  const jumlahOutboxSetelahPertama = Number(
    sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`)
  );
  sql(`UPDATE pesta.beregam_health SET maintenance_ran_at=NULL WHERE id=1;`);
  await worker("/heartbeat", { method: "POST", body: { workerId: "worker-A", waSessionStatus: "WORKING" } });
  await jeda(500);

  lapor(
    "  tidak diulang pada putaran pemeliharaan berikutnya",
    Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`)) ===
      jumlahOutboxSetelahPertama &&
      jumlahOutboxSetelahPertama > outboxSebelumIdle
  );

  // Warga yang sudah menyatakan berhenti TIDAK boleh dikejar penilaian,
  // sama seperti pesan otomatis lain.
  sql(
    `UPDATE pesta.beregam_sessions SET state='main_menu', context=NULL, ` +
      `last_activity_at=UTC_TIMESTAMP(3) - INTERVAL 11 MINUTE WHERE contact_id=${kontakId};`
  );
  sql(`UPDATE pesta.beregam_contacts SET opted_out_at=UTC_TIMESTAMP(3) WHERE id=${kontakId};`);
  const outboxSebelumOptOut = Number(
    sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`)
  );
  sql(`UPDATE pesta.beregam_health SET maintenance_ran_at=NULL WHERE id=1;`);
  await worker("/heartbeat", { method: "POST", body: { workerId: "worker-A", waSessionStatus: "WORKING" } });
  await jeda(500);

  lapor(
    "  warga yang sudah berhenti tidak dikejar penilaian",
    Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`)) ===
      outboxSebelumOptOut
  );

  sql(`UPDATE pesta.beregam_contacts SET opted_out_at=NULL WHERE id=${kontakId};`);
  sql(`UPDATE pesta.beregam_sessions SET state='main_menu', context=NULL WHERE contact_id=${kontakId};`);

  // === O. Formulir layanan lewat chat (SATU pesan) ========================
  //
  // Sengaja SATU pesan, bukan tanya-jawab bertahap. Alur bertahap membuat
  // bot membalas sepuluh kali untuk satu formulir, dan itu menabrak pembatas
  // laju - bot lalu mendadak diam persis saat warga sedang serius mengisi.
  console.log("\nO. FORMULIR LAYANAN LEWAT CHAT (SATU PESAN)");

  sql(`UPDATE pesta.beregam_sessions SET state='main_menu', mode='bot', context=NULL WHERE contact_id=${kontakId};`);
  const nomorPolos = sql(`SELECT phone FROM pesta.beregam_contacts WHERE id=${kontakId};`);

  // --- ViDCon (menu 3): format dulu, lalu satu pesan berisi seluruh isian --
  const keluarSebelumFormat = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`));
  await webhook(pesanWa("3"));
  await jeda(500);

  lapor(
    "menu 3 membuka formulir ViDCon",
    sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "filling_form"
  );
  lapor(
    "  formatnya dikirim dalam SATU pesan saja (hemat jatah pembatas laju)",
    Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`)) === keluarSebelumFormat + 1
  );
  lapor(
    "  format memuat seluruh label isian",
    (() => {
      const t = sql(`SELECT payload FROM pesta.beregam_outbox WHERE contact_id=${kontakId} ORDER BY id DESC LIMIT 1;`);
      return ["Nama:", "Instansi:", "Alamat:", "Email:", "No HP:", "Topik:", "Kebutuhan:", "Tanggal:", "Jam:", "Pendampingan:"]
        .every((l) => t.includes(l));
    })()
  );

  // Satu pesan berisi semuanya. "sama" memakai nomor WA pengirim, dan uraian
  // Kebutuhan sengaja ditulis dua baris untuk menguji sambungan antarbaris.
  await webhook(pesanWa(
    "Nama: Warga Uji ViDCon WA\n" +
    "Instansi: Universitas Uji\n" +
    "Alamat: Jl. Uji No. 1, Musi Rawas\n" +
    "Email: warga.uji.vidcon@email.com\n" +
    "No HP: sama\n" +
    "Topik: PDRB dan Inflasi\n" +
    "Kebutuhan: Saya ingin berkonsultasi soal data PDRB triwulanan.\n" +
    "Terutama sektor pertanian tahun 2023.\n" +
    "Tanggal: 01-09-2026\n" +
    "Jam: 09:00\n" +
    "Pendampingan: tidak"
  ));
  await jeda(700);

  const vidId = sql(`SELECT id FROM pesta.vidcon_requests WHERE nama='Warga Uji ViDCon WA' ORDER BY id DESC LIMIT 1;`);
  lapor("ViDCon terkirim lewat SATU pesan, masuk ke tabel yang sama dengan web", vidId !== "");
  lapor("  sumber tercatat WHATSAPP", sql(`SELECT sumber FROM pesta.vidcon_requests WHERE id=${vidId};`) === "WHATSAPP");
  lapor(
    "  'sama' memakai nomor WhatsApp pengirim",
    sql(`SELECT no_hp FROM pesta.vidcon_requests WHERE id=${vidId};`) === nomorPolos
  );
  lapor(
    "  tanggal & jam terbaca dari format DD-MM-YYYY",
    sql(`SELECT CONCAT(tanggal,'|',jam) FROM pesta.vidcon_requests WHERE id=${vidId};`) === "2026-09-01|09:00"
  );
  lapor(
    "  uraian multi-baris TIDAK terpotong di baris pertama",
    sql(`SELECT deskripsi FROM pesta.vidcon_requests WHERE id=${vidId};`).includes("sektor pertanian")
  );
  lapor(
    "  'tidak' pada isian opsional = dikosongkan",
    sql(`SELECT IFNULL(layanan_inklusif,'null') FROM pesta.vidcon_requests WHERE id=${vidId};`) === "null"
  );
  lapor(
    "  sesi kembali normal setelah formulir tersimpan",
    sql(`SELECT CONCAT(state,'|',IFNULL(context,'null')) FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "main_menu|null"
  );

  // --- Isian keliru: dilaporkan sekaligus, dan yang benar TETAP diingat ----
  await webhook(pesanWa("3"));
  await jeda(400);
  await webhook(pesanWa(
    "Nama: Warga Uji ViDCon Ralat\n" +
    "Instansi: Pribadi\n" +
    "Alamat: Jl. Ralat\n" +
    "Email: bukan-email\n" +
    "No HP: sama\n" +
    "Topik: Inflasi\n" +
    "Kebutuhan: Ingin memahami penghitungan inflasi bulanan.\n" +
    "Tanggal: 32-13-2026\n" +
    "Jam: 09:00\n" +
    "Pendampingan: tidak"
  ));
  await jeda(700);

  const pesanRalat = sql(`SELECT payload FROM pesta.beregam_outbox WHERE contact_id=${kontakId} ORDER BY id DESC LIMIT 1;`);
  lapor(
    "dua isian keliru dilaporkan SEKALIGUS dalam satu pesan",
    pesanRalat.includes("Email") && pesanRalat.includes("Tanggal") && pesanRalat.includes("2 isian")
  );
  lapor(
    "  belum tersimpan selama masih ada yang keliru",
    Number(sql(`SELECT COUNT(*) FROM pesta.vidcon_requests WHERE nama='Warga Uji ViDCon Ralat';`)) === 0
  );
  lapor(
    "  isian yang sudah benar TETAP diingat (tidak perlu ketik ulang semua)",
    sql(`SELECT context FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`).includes("Warga Uji ViDCon Ralat")
  );

  // Cukup kirim dua baris yang salah saja - sisanya dipakai dari ingatan.
  await webhook(pesanWa("Email: ralat.uji@email.com\nTanggal: 02-09-2026"));
  await jeda(700);

  const ralatId = sql(`SELECT id FROM pesta.vidcon_requests WHERE nama='Warga Uji ViDCon Ralat' ORDER BY id DESC LIMIT 1;`);
  lapor("mengirim HANYA baris yang diralat sudah cukup untuk menyelesaikan formulir", ralatId !== "");
  lapor(
    "  isian lama ikut tersimpan utuh",
    sql(`SELECT CONCAT(email,'|',tanggal,'|',cakupan) FROM pesta.vidcon_requests WHERE id=${ralatId};`) === "ralat.uji@email.com|2026-09-02|Inflasi"
  );

  // --- Balasan di luar format: dikirimi format lagi, TIDAK dimarahi -------
  await webhook(pesanWa("3"));
  await jeda(400);
  await webhook(pesanWa("halo pak saya mau konsultasi"));
  await jeda(600);
  lapor(
    "balasan bebas tanpa format dibalas dengan formatnya lagi",
    sql(`SELECT payload FROM pesta.beregam_outbox WHERE contact_id=${kontakId} ORDER BY id DESC LIMIT 1;`).includes("Nama:")
  );
  lapor(
    "  sesi tetap di formulir, warga tidak dilempar keluar",
    sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "filling_form"
  );

  await webhook(pesanWa("batal"));
  await jeda(400);
  lapor(
    "'batal' selalu berfungsi - warga tidak pernah terjebak",
    sql(`SELECT state FROM pesta.beregam_sessions WHERE contact_id=${kontakId};`) === "main_menu"
  );

  // --- Pengaduan (menu 7): kategori bernomor, isian opsional dikosongkan --
  await webhook(pesanWa("7"));
  await jeda(400);
  await webhook(pesanWa(
    "Nama: Warga Uji Aduan WA\n" +
    "Kategori: 3\n" +
    "Aduan: Data yang diunggah di website sering tidak sesuai format terbaru.\n" +
    "Email: aduan.uji@email.com\n" +
    "No HP: -"
  ));
  await jeda(700);

  const aduId = sql(`SELECT id FROM pesta.pengaduans WHERE nama='Warga Uji Aduan WA' ORDER BY id DESC LIMIT 1;`);
  lapor("Pengaduan terkirim lewat SATU pesan", aduId !== "");
  lapor("  sumber tercatat WHATSAPP", sql(`SELECT sumber FROM pesta.pengaduans WHERE id=${aduId};`) === "WHATSAPP");
  lapor(
    "  kategori angka 3 terpetakan ke 'Publikasi & Data'",
    sql(`SELECT kategori FROM pesta.pengaduans WHERE id=${aduId};`) === "Publikasi & Data"
  );
  lapor(
    "  No HP '-' tersimpan NULL, bukan teks '-'",
    sql(`SELECT IFNULL(no_hp,'null') FROM pesta.pengaduans WHERE id=${aduId};`) === "null"
  );

  // --- Permintaan data (menu 2) -------------------------------------------
  await webhook(pesanWa("2"));
  await jeda(400);
  await webhook(pesanWa(
    "Nama: Warga Uji Data WA\n" +
    "Instansi: Bappeda Musi Rawas\n" +
    "Alamat: Jl. Data No. 2, Musi Rawas\n" +
    "Email: data.uji@email.com\n" +
    "No HP: 081234500000\n" +
    "Data diminta: Data PDRB per kecamatan tahun 2023\n" +
    "Keperluan: Untuk penyusunan dokumen perencanaan daerah\n" +
    "Format: 2\n" +
    "Catatan: -"
  ));
  await jeda(700);

  const dataId = sql(`SELECT id FROM pesta.permintaan_data WHERE nama='Warga Uji Data WA' ORDER BY id DESC LIMIT 1;`);
  lapor("Permintaan data terkirim lewat SATU pesan", dataId !== "");
  lapor("  sumber tercatat WHATSAPP", sql(`SELECT sumber FROM pesta.permintaan_data WHERE id=${dataId};`) === "WHATSAPP");
  lapor(
    "  nomor yang ditulis sendiri dipakai apa adanya (bukan nomor pengirim)",
    sql(`SELECT no_hp FROM pesta.permintaan_data WHERE id=${dataId};`) === "081234500000"
  );
  lapor(
    "  Format angka 2 terpetakan ke HARD_COPY",
    sql(`SELECT format_diinginkan FROM pesta.permintaan_data WHERE id=${dataId};`) === "HARD_COPY"
  );
  lapor(
    "  catatan '-' tersimpan NULL",
    sql(`SELECT IFNULL(catatan,'null') FROM pesta.permintaan_data WHERE id=${dataId};`) === "null"
  );

  // --- Pagar utama: SATU formulir penuh = 2 balasan bot, bukan 10 ---------
  //
  // Inilah alasan alur bertahap ditinggalkan, dan ukuran yang harus dijaga
  // supaya tidak diam-diam kembali mahal. Dihitung dari baris OUTBOX, bukan
  // beregam_messages: baris pesan keluar baru ditulis saat worker meng-ack
  // pengiriman, dan di uji ini tidak ada worker yang berjalan - menghitung
  // dari sana akan selalu menghasilkan angka nol yang menipu.
  sql(`UPDATE pesta.beregam_sessions SET state='main_menu', mode='bot', context=NULL WHERE contact_id=${kontakId};`);
  const outboxSebelumAlur = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`));

  await webhook(pesanWa("2"));
  await jeda(400);
  await webhook(pesanWa(
    "Nama: Warga Uji Data Hemat\n" +
    "Instansi: Pribadi\n" +
    "Alamat: Jl. Hemat\n" +
    "Email: hemat.uji@email.com\n" +
    "No HP: sama\n" +
    "Data diminta: Jumlah penduduk per desa 2023\n" +
    "Keperluan: Bahan penelitian skripsi\n" +
    "Format: 1\n" +
    "Catatan: -"
  ));
  await jeda(700);

  const balasanSatuFormulir =
    Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`)) - outboxSebelumAlur;

  lapor(
    "satu formulir penuh hanya butuh 2 balasan bot (format + konfirmasi)",
    balasanSatuFormulir === 2,
    `${balasanSatuFormulir} balasan`
  );
  lapor(
    "  jauh di bawah pembatas laju, jadi bot tidak akan mendadak diam di tengah formulir",
    balasanSatuFormulir < 10
  );
  lapor(
    "  dan formulirnya benar-benar tersimpan",
    Number(sql(`SELECT COUNT(*) FROM pesta.permintaan_data WHERE nama='Warga Uji Data Hemat';`)) === 1
  );

  // === P. Notifikasi permohonan baru ke WA petugas =========================
  //
  // Petugas tidak duduk memantau panel sepanjang hari. Tanpa pemberitahuan,
  // permohonan bisa mengendap berjam-jam tanpa ada yang tahu - dan warga
  // sudah telanjur diberi tahu bahwa permohonannya diterima.
  // === Q. Pengalamatan LID: nomor telepon asli ============================
  //
  // WhatsApp kini kerap mengirim `from` berupa LID ("190666499973242@lid"),
  // bukan nomor telepon. Angkanya panjang dan tampak seperti nomor, dan itu
  // yang membuatnya berbahaya: sempat tersimpan sebagai nomor warga di inbox
  // petugas, di notifikasi, dan lewat pintasan "sama" pada formulir - nomor
  // yang kalau ditelepon petugas tidak akan pernah sampai ke siapa pun.
  console.log("\nQ. PENGALAMATAN LID - NOMOR TELEPON ASLI");

  const LID = "190666499973242";
  const NOMOR_ASLI = "6285228844884";
  sql(`DELETE FROM pesta.beregam_contacts WHERE wa_id='${LID}@lid';`);

  await webhook(pesanWaLid("halo", LID, NOMOR_ASLI, "Novi Irawan"));
  await jeda(500);

  const kontakLid = sql(`SELECT id FROM pesta.beregam_contacts WHERE wa_id='${LID}@lid';`);
  lapor("kontak LID dibuat", kontakLid !== "");
  lapor(
    "  nomor tersimpan adalah nomor ASLI, bukan angka LID",
    sql(`SELECT phone FROM pesta.beregam_contacts WHERE id=${kontakLid};`) === NOMOR_ASLI
  );
  lapor(
    "  nama profil terbaca dari _data (dulu selalu kosong pada LID)",
    sql(`SELECT IFNULL(name,'') FROM pesta.beregam_contacts WHERE id=${kontakLid};`) === "Novi Irawan"
  );

  // Kontak lama yang terlanjur menyimpan angka LID harus sembuh sendiri
  // begitu ada pesan berikutnya - tanpa perlu tindakan petugas.
  sql(`UPDATE pesta.beregam_contacts SET phone='${LID}' WHERE id=${kontakLid};`);
  await webhook(pesanWaLid("menu", LID, NOMOR_ASLI, "Novi Irawan"));
  await jeda(500);
  lapor(
    "kontak lama bernomor LID sembuh sendiri saat ada pesan baru",
    sql(`SELECT phone FROM pesta.beregam_contacts WHERE id=${kontakLid};`) === NOMOR_ASLI
  );

  // LID TANPA nomor alternatif: lebih baik kosong daripada angka palsu.
  const LID2 = "555000111222333";
  sql(`DELETE FROM pesta.beregam_contacts WHERE wa_id='${LID2}@lid';`);
  await webhook(pesanWa("halo", { from: `${LID2}@lid` }));
  await jeda(500);
  lapor(
    "LID tanpa nomor alternatif disimpan KOSONG, bukan angka LID yang menyamar",
    sql(`SELECT IFNULL(phone,'') FROM pesta.beregam_contacts WHERE wa_id='${LID2}@lid';`) === ""
  );

  // Pintasan "sama" tidak boleh menaruh nomor palsu ke permohonan resmi.
  sql(`UPDATE pesta.beregam_sessions SET state='main_menu', mode='bot', context=NULL WHERE contact_id=(SELECT id FROM pesta.beregam_contacts WHERE wa_id='${LID2}@lid');`);
  await webhook(pesanWa("2", { from: `${LID2}@lid` }));
  await jeda(400);
  await webhook(pesanWa(
    "Nama: Warga Uji Data Tanpa Nomor\nInstansi: Pribadi\nAlamat: Jl. Uji\n" +
    "Email: tanpa.nomor@email.com\nNo HP: sama\nData diminta: PDRB\n" +
    "Keperluan: Uji nomor tidak terbaca\nFormat: 1\nCatatan: -",
    { from: `${LID2}@lid` }
  ));
  await jeda(600);

  lapor(
    "'sama' saat nomor tidak terbaca -> TIDAK menyimpan nomor palsu",
    Number(sql(`SELECT COUNT(*) FROM pesta.permintaan_data WHERE nama='Warga Uji Data Tanpa Nomor';`)) === 0
  );
  lapor(
    "  warga diminta mengetik nomornya sendiri, bukan dibiarkan bingung",
    sql(`SELECT payload FROM pesta.beregam_outbox WHERE contact_id=(SELECT id FROM pesta.beregam_contacts WHERE wa_id='${LID2}@lid') ORDER BY id DESC LIMIT 1;`).includes("ketik nomornya")
  );

  sql(`DELETE FROM pesta.permintaan_data WHERE nama='Warga Uji Data Tanpa Nomor';`);
  sql(`DELETE FROM pesta.beregam_contacts WHERE wa_id IN ('${LID}@lid','${LID2}@lid');`);

  // === R. Petunjuk formulir tidak boleh terbaca sebagai jawaban ===========
  //
  // Warga menyalin SELURUH pesan format lalu mengirimkannya kembali, termasuk
  // baris petunjuk kita sendiri. Petunjuk lama ditulis "No HP: tulis..." dan
  // "Format: 1=Berkas digital...", sehingga terbaca sebagai isian dan
  // MENIMPA jawaban warga. Nomor HP yang sudah benar jadi tertolak, dan
  // pilihan Format diam-diam terisi dari petunjuk tanpa ada yang tahu.
  console.log("\nR. PETUNJUK FORMULIR TIDAK BOLEH TERBACA SEBAGAI JAWABAN");

  sql(`UPDATE pesta.beregam_sessions SET state='main_menu', mode='bot', context=NULL WHERE contact_id=${kontakId};`);
  await webhook(pesanWa("2"));
  await jeda(400);

  const formatDikirim = sql(`SELECT payload FROM pesta.beregam_outbox WHERE contact_id=${kontakId} ORDER BY id DESC LIMIT 1;`);
  lapor(
    "tidak ada baris petunjuk yang berbentuk 'Label: isi'",
    !/_(No HP|Format|Kategori|Nama|Catatan|Tanggal|Jam|Pendampingan):/i.test(formatDikirim)
  );

  // Kirim balik SELURUH pesan format apa adanya + isian, seperti yang
  // benar-benar dilakukan warga.
  await webhook(pesanWa(
    "🗂️ *FORMULIR PERMINTAAN DATA*\n\n" +
    "Salin pesan ini, lengkapi setelah tanda titik dua, lalu kirim kembali dalam *satu* pesan.\n\n" +
    "Nama:Habib\nInstansi:BPS\nAlamat:Musi Rawas\nEmail:habibwafi96@gmail.com\n" +
    "No HP:081384467988\nData diminta:Pdrb\nKeperluan:Kuliah\nFormat:2\nCatatan:bebas\n\n" +
    "_Kolom format diisi angka - 1=Berkas digital, 2=Cetak, 3=Ambil langsung di kantor._\n" +
    '_Kolom nomor HP boleh diisi "sama" untuk memakai nomor WhatsApp ini. Kolom catatan boleh diisi "-"._\n\n' +
    "Ketik *batal* kapan saja untuk keluar."
  ));
  await jeda(700);

  const idSalin = sql(`SELECT id FROM pesta.permintaan_data WHERE nama='Habib' AND keperluan='Kuliah' ORDER BY id DESC LIMIT 1;`);
  lapor("formulir yang disalin utuh (petunjuk ikut terkirim) tetap tersimpan", idSalin !== "");
  lapor(
    "  nomor HP yang diisi warga TIDAK tertimpa kalimat petunjuk",
    sql(`SELECT no_hp FROM pesta.permintaan_data WHERE id=${idSalin};`) === "081384467988"
  );
  lapor(
    "  Format terbaca dari jawaban warga (2=Cetak), bukan dari baris petunjuk",
    sql(`SELECT format_diinginkan FROM pesta.permintaan_data WHERE id=${idSalin};`) === "HARD_COPY"
  );
  sql(`DELETE FROM pesta.permintaan_data WHERE id=${idSalin};`);

  console.log("\nP. NOTIFIKASI PERMOHONAN BARU KE WA PETUGAS");

  if (!env.BEREGAM_STAFF_WA) {
    lapor("BEREGAM_STAFF_WA belum diisi - bagian ini dilewati", true);
  } else {
    const nomorStaf2 = env.BEREGAM_STAFF_WA.replace(/[^0-9]/g, "");
    const notifStaf = (pola) =>
      Number(sql(
        `SELECT COUNT(*) FROM pesta.beregam_outbox o JOIN pesta.beregam_contacts c ON c.id=o.contact_id ` +
        `WHERE c.phone='${nomorStaf2}' AND o.payload LIKE '%${pola}%';`
      ));

    // Permohonan lewat WhatsApp (dari bagian O di atas).
    lapor("permohonan ViDCon dari WhatsApp memberi tahu petugas", notifStaf("Permohonan ViDCon baru") > 0);
    lapor("aduan dari WhatsApp memberi tahu petugas", notifStaf("Aduan / saran baru") > 0);
    lapor("permintaan data dari WhatsApp memberi tahu petugas", notifStaf("Permintaan data baru") > 0);
    lapor(
      "  notifikasinya mengarahkan petugas ke panel PESTA, bukan membalas dari chat",
      notifStaf("bpskabmusirawas.com/admin") > 0
    );
    lapor(
      "  menyebut asal permohonan supaya petugas tahu warga bisa dibalas lewat mana",
      notifStaf("WhatsApp Beregam") > 0
    );

    // Permohonan lewat FORMULIR WEB - jalur yang sama sekali berbeda, tapi
    // petugas harus sama-sama diberi tahu.
    const sebelumWeb = notifStaf("Formulir web PESTA");
    const resWeb = await fetch(`${B}/api/permintaan-data`, {
      method: "POST",
      body: (() => {
        const f = new FormData();
        f.append("nama", "Warga Uji Data Web Notif");
        f.append("instansi", "Pribadi");
        f.append("alamat", "Jl. Web");
        f.append("noHp", "081234500009");
        f.append("email", "web.notif@email.com");
        f.append("jenisData", "Data uji notifikasi web");
        f.append("keperluan", "Memastikan petugas diberi tahu");
        f.append("formatDiinginkan", "SOFT_FILE");
        return f;
      })(),
    });
    await jeda(600);

    lapor("formulir web tersimpan", resWeb.status === 201);
    lapor(
      "permohonan dari FORMULIR WEB juga memberi tahu petugas",
      notifStaf("Formulir web PESTA") > sebelumWeb
    );

    sql(`DELETE FROM pesta.permintaan_data WHERE nama='Warga Uji Data Web Notif';`);
    sql(`DELETE FROM pesta.beregam_contacts WHERE phone='${nomorStaf2}';`);
  }

  // === S. Menu 4 & 5 terhubung ke sumber resmi BPS ========================
  //
  // Sebelumnya kedua menu ini membalas dengan penanda "[ISI: sebutkan
  // publikasi unggulan...]" - catatan untuk petugas yang tidak pernah
  // dilengkapi, dan warga sungguhan membacanya. Yang dijaga di sini bukan
  // sekadar "ada jawaban", melainkan bahwa TIDAK ADA penanda internal apa
  // pun yang pernah sampai ke warga, dalam keadaan apa pun - termasuk saat
  // Web API BPS tidak bisa dihubungi.
  console.log("\nS. MENU 4 & 5 TERHUBUNG KE SUMBER RESMI BPS");

  sql(`UPDATE pesta.beregam_sessions SET state='main_menu', mode='bot', context=NULL WHERE contact_id=${kontakId};`);

  const balasanMenu = async (angka) => {
    await webhook(pesanWa(angka));
    await jeda(900);
    return sql(
      `SELECT payload FROM pesta.beregam_outbox WHERE contact_id=${kontakId} AND type='text' ORDER BY id DESC LIMIT 2;`
    );
  };

  const m4 = await balasanMenu("4");
  lapor("menu 4 menjawab publikasi", m4.includes("ublikasi"));
  lapor(
    "  TIDAK ada penanda [ISI: ...] yang bocor ke warga",
    !m4.includes("[ISI:") && !m4.includes("ISI:")
  );
  lapor("  TIDAK ada penanda [BPS:...] yang bocor ke warga", !m4.includes("[BPS:"));
  lapor(
    "  menyertakan tautan resmi BPS Musi Rawas",
    m4.includes("musirawaskab.bps.go.id")
  );

  sql(`UPDATE pesta.beregam_sessions SET state='main_menu' WHERE contact_id=${kontakId};`);
  const m5 = await balasanMenu("5");
  lapor("menu 5 menjawab tabel/indikator statistik", m5.includes("abel") || m5.includes("ndikator"));
  lapor(
    "  TIDAK ada penanda [ISI: ...] yang bocor ke warga",
    !m5.includes("[ISI:") && !m5.includes("ISI:")
  );
  lapor("  TIDAK ada penanda [BPS:...] yang bocor ke warga", !m5.includes("[BPS:"));
  lapor(
    "  mengarahkan ke menu 2 untuk data yang belum tersedia",
    m5.includes("Permintaan Data") || m5.includes("menu *2*")
  );

  // Pagar menyeluruh: tidak ada satu pun jawaban menu yang menyisakan
  // penanda internal. Menangkap penanda baru yang lupa ditangani kode.
  const semuaJawabanMenu = sql(
    `SELECT GROUP_CONCAT(payload SEPARATOR ' || ') FROM pesta.beregam_outbox WHERE contact_id=${kontakId};`
  );
  lapor(
    "seluruh jawaban yang pernah dikirim bebas dari penanda internal",
    !/\[(ISI|BPS|FORM|ESKALASI)[:\]]/.test(semuaJawabanMenu)
  );

  // === Bersihkan ==========================================================
  bersihkan();
  console.log("\nData uji dibersihkan.");

  console.log("");
  if (gagal === 0) {
    console.log("SEMUA UJI LULUS.\n");
  } else {
    console.log(`${gagal} UJI GAGAL.\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Uji error:", e);
  process.exit(1);
});
