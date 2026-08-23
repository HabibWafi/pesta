#!/usr/bin/env node
/**
 * Uji undangan ViDCon lewat WhatsApp.
 *
 *   npm run uji:vidcon
 *
 * Butuh server pengembangan berjalan (npm run dev) dan database lokal.
 *
 * Yang dijaga di sini, urut dari yang paling mahal bila salah:
 *
 *   1. Nomor tujuan. Undangan berisi nama, jadwal, dan tautan rapat. Salah
 *      menormalkan nomor berarti semua itu terkirim ke orang asing, dan
 *      warga yang berhak justru menunggu undangan yang tidak pernah datang.
 *   2. Status hanya berubah bila undangannya benar-benar masuk antrean.
 *      Status "DISETUJUI" pada warga yang tidak pernah diundang adalah
 *      kegagalan yang tidak terlihat sampai hari-H.
 *   3. Isi undangan diambil dari permohonan warga sendiri - tidak ada yang
 *      diketik ulang, jadi tidak ada yang bisa salah ketik.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import jwt from "jsonwebtoken";

import { keNomorWa } from "../../src/lib/beregam/nomor.js";
import { susunUndangan, tanggalPanjang } from "../../src/lib/beregam/undangan-vidcon.js";

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

let gagal = 0;
function lapor(nama: string, lulus: boolean, ket = "") {
  console.log(`  ${lulus ? "LULUS" : "GAGAL"}  ${nama}${ket ? `  (${ket})` : ""}`);
  if (!lulus) gagal += 1;
}

function sql(q: string): string {
  return execFileSync(MYSQL, ["-u", "root", "--skip-column-names", "-e", q], {
    encoding: "utf8",
  }).trim();
}

const token = jwt.sign(
  { id: 2, email: "uji@bps.go.id", name: "Petugas Uji", role: "ADMIN" },
  env.JWT_SECRET!,
  { expiresIn: "5m" }
);
const kuki = { Cookie: `pesta_admin_token=${token}` };

const NAMA_UJI = "Warga Uji Undangan ViDCon";
const bersihkan = () => {
  sql(`DELETE FROM pesta.vidcon_requests WHERE nama='${NAMA_UJI}';`);
  sql(`DELETE FROM pesta.beregam_contacts WHERE phone='6281373028055';`);
};

console.log("\nUji undangan ViDCon lewat WhatsApp\n");
bersihkan();

// === A. Nomor tujuan =======================================================
console.log("A. NOMOR TUJUAN - salah satu digit saja sudah salah orang");
const nomorOk = (t: string, harap: string) => {
  const r = keNomorWa(t);
  lapor(`  ${JSON.stringify(t)} -> ${harap}`, r.ok && r.wa === harap);
};
nomorOk("081373028055", "6281373028055");
nomorOk("+62 813-7302-8055", "6281373028055");
nomorOk("6281373028055", "6281373028055");
nomorOk("81373028055", "6281373028055");

const nomorTolak = (t: string, ket: string) => {
  const r = keNomorWa(t);
  lapor(`  ${JSON.stringify(t)} DITOLAK - ${ket}`, !r.ok);
};
nomorTolak("021555000", "nomor rumah, bukan seluler");
nomorTolak("085", "terlalu pendek");
nomorTolak("", "kosong");
nomorTolak("abcdefgh", "bukan angka");
nomorTolak("1234567890123", "tidak diawali 08/62/8");

// === B. Isi undangan =======================================================
console.log("\nB. ISI UNDANGAN DIAMBIL DARI PERMOHONAN WARGA");
const contoh = {
  id: 42,
  nama: "Sabit Huraira",
  asalInstansi: "BPS",
  tanggal: "2026-08-26",
  jam: "13:30",
  cakupan: "Kependudukan & Ketenagakerjaan",
};
const naskah =
  "Halo {nama} dari {instansi}. Jadwal {tanggal} pukul {jam}. Topik {topik}. " +
  "Tiket #{tiket}. Zoom: {zoom}";
const teks = susunUndangan(contoh, naskah, "https://zoom.test/abc");

lapor("nama pemohon disisipkan", teks.includes("Sabit Huraira"));
lapor("instansi disisipkan", teks.includes("BPS"));
lapor("tanggal ditulis lengkap berbahasa Indonesia", teks.includes("Rabu, 26 Agustus 2026"));
lapor("jam disisipkan", teks.includes("13:30"));
lapor("topik disisipkan", teks.includes("Kependudukan & Ketenagakerjaan"));
lapor("nomor tiket disisipkan", teks.includes("#42"));
lapor("tautan Zoom disisipkan", teks.includes("https://zoom.test/abc"));
lapor(
  "tidak ada variabel yang tertinggal belum terisi",
  !/\{(nama|instansi|tanggal|jam|topik|zoom|tiket)\}/.test(teks)
);
lapor("tanggal tak terbaca dikembalikan apa adanya, bukan 'Invalid Date'", tanggalPanjang("bukan-tanggal") === "bukan-tanggal");

// === C. Ujung ke ujung lewat API ===========================================
console.log("\nC. UJUNG KE UJUNG LEWAT API ADMIN");

const buatPermohonan = (noHp: string) => {
  sql(
    `INSERT INTO pesta.vidcon_requests (nama, asal_instansi, alamat, no_hp, email, cakupan, deskripsi, tanggal, jam, status, sumber, created_at, updated_at) ` +
      `VALUES ('${NAMA_UJI}','BPS','Jl. Uji','${noHp}','uji@email.com','Kependudukan & Ketenagakerjaan','Uji undangan','2026-08-26','13:30','PENDING','WEB',UTC_TIMESTAMP(3),UTC_TIMESTAMP(3));`
  );
  return sql(`SELECT id FROM pesta.vidcon_requests WHERE nama='${NAMA_UJI}' ORDER BY id DESC LIMIT 1;`);
};

// --- Tanpa login ---
const idA = buatPermohonan("081373028055");
const tanpaLogin = await fetch(`${B}/api/admin/vidcon/${idA}/proses`, { method: "POST" });
lapor("tanpa login ditolak 401", tanpaLogin.status === 401);
lapor(
  "  status permohonan tidak tersentuh",
  sql(`SELECT status FROM pesta.vidcon_requests WHERE id=${idA};`) === "PENDING"
);

// --- Pratinjau tidak mengirim apa pun ---
const outboxSebelum = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox;`));
const pratinjau = await fetch(`${B}/api/admin/vidcon/${idA}/proses`, { headers: kuki });
const dataPratinjau = await pratinjau.json();
lapor("pratinjau berhasil", pratinjau.status === 200 && dataPratinjau.success === true);
lapor("  nomor tujuan sudah dinormalkan", dataPratinjau.nomorWa === "6281373028055");
lapor("  pratinjau memuat jadwal & topik warga", String(dataPratinjau.pesan).includes("26 Agustus 2026") && String(dataPratinjau.pesan).includes("Kependudukan"));
lapor(
  "  pratinjau TIDAK mengirim apa pun ke antrean",
  Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox;`)) === outboxSebelum
);
lapor(
  "  pratinjau TIDAK mengubah status",
  sql(`SELECT status FROM pesta.vidcon_requests WHERE id=${idA};`) === "PENDING"
);

// --- Kirim sungguhan ---
const kirim = await fetch(`${B}/api/admin/vidcon/${idA}/proses`, { method: "POST", headers: kuki });
const dataKirim = await kirim.json();
lapor("kirim berhasil", kirim.status === 200 && dataKirim.success === true, dataKirim.message?.slice(0, 60));

const antrean = sql(
  `SELECT o.payload FROM pesta.beregam_outbox o JOIN pesta.beregam_contacts c ON c.id=o.contact_id ` +
    `WHERE c.phone='6281373028055' ORDER BY o.id DESC LIMIT 1;`
);
lapor("  undangan masuk antrean untuk nomor warga", antrean !== "");
lapor("  isinya memuat jadwal, topik, dan tautan Zoom", antrean.includes("26 Agustus 2026") && antrean.includes("Kependudukan") && antrean.includes("zoom.us"));
lapor(
  "  status berubah jadi DISETUJUI",
  sql(`SELECT status FROM pesta.vidcon_requests WHERE id=${idA};`) === "APPROVED"
);
lapor(
  "  catatan petugas mencatat siapa yang mengirim",
  sql(`SELECT IFNULL(catatan_admin,'') FROM pesta.vidcon_requests WHERE id=${idA};`).includes("Petugas Uji")
);

// --- Nomor tidak sah: TIDAK dikirim, status TIDAK berubah ---
sql(`DELETE FROM pesta.vidcon_requests WHERE nama='${NAMA_UJI}';`);
const idB = buatPermohonan("021555000");
const outboxSebelumGagal = Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox;`));
const gagalKirim = await fetch(`${B}/api/admin/vidcon/${idB}/proses`, { method: "POST", headers: kuki });
const dataGagal = await gagalKirim.json();

lapor("nomor tidak sah ditolak 422", gagalKirim.status === 422);
lapor("  alasannya dijelaskan ke petugas", String(dataGagal.message).toLowerCase().includes("nomor"));
lapor("  menyebut email warga sebagai jalan lain", String(dataGagal.message).includes("uji@email.com"));
lapor(
  "  TIDAK ada yang masuk antrean",
  Number(sql(`SELECT COUNT(*) FROM pesta.beregam_outbox;`)) === outboxSebelumGagal
);
lapor(
  "  status TETAP PENDING - pekerjaan yang belum selesai tetap terlihat belum selesai",
  sql(`SELECT status FROM pesta.vidcon_requests WHERE id=${idB};`) === "PENDING"
);

bersihkan();
console.log(gagal === 0 ? "\nSEMUA UJI LULUS.\n" : `\n${gagal} UJI GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
