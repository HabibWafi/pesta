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
      pushName: "Warga Uji",
    },
  };
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
