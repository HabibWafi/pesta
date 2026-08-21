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
  lapor("  menu memuat 6 pilihan", isiMenu.includes("Bicara dengan petugas"));

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
  lapor("foto dibalas ramah, bukan dianggap salah", Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox WHERE contact_id=${kontakId} AND payload LIKE '%hanya bisa membaca%';`)) > 0);
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
