#!/usr/bin/env node
/**
 * Uji klien Web API resmi BPS.
 *
 *   npm run uji:bps
 *
 * Tidak menyentuh jaringan sungguhan - `fetch` diganti tiruan. Justru itu
 * intinya: yang diuji adalah bagaimana kode BEREAKSI terhadap bentuk jawaban
 * yang mungkin datang dari BPS, termasuk bentuk-bentuk gagal yang sulit
 * dipancing sengaja di dunia nyata.
 *
 * KENAPA UJI INI ADA
 *
 * Bentuk pasti jawaban Web API BPS tidak bisa diverifikasi tanpa kunci resmi,
 * dan kunci itu dipegang instansi, bukan tersedia saat menulis kode. Jadi
 * kodenya ditulis defensif, dan berkas ini yang membuktikan sikap defensif
 * itu benar-benar bekerja: bentuk yang sesuai dokumentasi terbaca, dan
 * SEMUA bentuk lain berakhir sebagai null - yang berarti bot memakai
 * jawaban cadangan berisi tautan resmi, bukan diam atau menampilkan galat.
 */

process.env.BPS_WEBAPI_KEY = "KUNCI-UJI";

const { ambilPublikasiLangsung, ambilTabelLangsung, ambilDetailTabelLangsung, uraiDataDinamis, uraiDataSimdasi } = await import(
  "../../src/lib/beregam/bps-api.js"
);

let gagal = 0;
function lapor(nama: string, lulus: boolean, ket = "") {
  console.log(`  ${lulus ? "LULUS" : "GAGAL"}  ${nama}${ket ? `  (${ket})` : ""}`);
  if (!lulus) gagal += 1;
}

const fetchAsli = globalThis.fetch;
function tiruJawaban(isi: unknown, opsi: { status?: number; teksMentah?: string } = {}) {
  globalThis.fetch = (async () =>
    new Response(opsi.teksMentah ?? JSON.stringify(isi), {
      status: opsi.status ?? 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
}

console.log("\nUji klien Web API BPS\n");

// === A. Bentuk sesuai dokumentasi ==========================================
console.log("A. BENTUK SESUAI DOKUMENTASI BPS");

tiruJawaban({
  status: "OK",
  "data-availability": "available",
  data: [
    { page: 1, pages: 1, per_page: 10, count: 2, total: 2 },
    [
      {
        pub_id: "abc123",
        title: "Kabupaten Musi Rawas Dalam Angka 2026",
        rl_date: "2026-02-27",
        pdf: "https://musirawaskab.bps.go.id/unduh/abc123.pdf",
      },
      {
        pub_id: "def456",
        title: "Indeks Pembangunan Manusia Kabupaten Musi Rawas 2025",
        rl_date: "2026-02-27",
      },
    ],
  ],
});

const pub = await ambilPublikasiLangsung();
lapor("publikasi terbaca", Array.isArray(pub) && pub.length === 2, `${pub?.length ?? 0} entri`);
lapor("  judul dipertahankan apa adanya", pub?.[0].judul === "Kabupaten Musi Rawas Dalam Angka 2026");
lapor("  tanggal diterjemahkan ke bahasa Indonesia", pub?.[0].tanggal === "27 Februari 2026");
lapor("  tautan unduh resmi dipakai apa adanya", pub?.[0].tautan?.endsWith("abc123.pdf") === true);
lapor("  entri tanpa pdf tetap terbaca, tautannya null", pub?.[1].tautan === null);

tiruJawaban({
  status: "OK",
  data: [
    { page: 1, total: 48 },
    [
      { table_id: 1, title: "Jumlah Penduduk (Jiwa)", subj: "Kependudukan", updt_date: "2026-02-20" },
      { table_id: 2, title: "Kepadatan Penduduk (Jiwa/km2)", updt_date: "2025-03-20" },
    ],
  ],
});

const tab = await ambilTabelLangsung();
console.log("");
lapor("tabel statistik terbaca", Array.isArray(tab) && tab.length === 2, `${tab?.length ?? 0} entri`);
lapor("  judul dan subjek terbaca", tab?.[0].judul === "Jumlah Penduduk (Jiwa)" && tab?.[0].subjek === "Kependudukan");
lapor("  tanggal pembaruan diterjemahkan", tab?.[0].diperbarui === "20 Februari 2026");

tiruJawaban({ status: "OK", data: { table_id: 2, title: "Kepadatan Penduduk", updt_date: "2025-03-20", excel: "https://webapi.bps.go.id/download/contoh.xlsx", size: "12 KB", table: "<table>tidak boleh diparsing</table>" } });
const detailTabel = await ambilDetailTabelLangsung("2");
lapor("detail tabel statis hanya menghasilkan metadata", detailTabel?.judul === "Kepadatan Penduduk" && !("table" in detailTabel));
lapor("  tautan unduh resmi dipertahankan", detailTabel?.tautanUnduh?.endsWith("contoh.xlsx") === true);

const dynamic = uraiDataDinamis({
  status: "OK",
  var: [{ val: 10, label: "Jumlah Penduduk", unit: "Jiwa" }],
  turvar: [{ val: 0, label: "Total" }],
  vervar: [{ val: 1605, label: "Kabupaten Musi Rawas" }],
  tahun: [{ val: 2024, label: "2024" }],
  turtahun: [{ val: 0, label: "Tahun" }],
  datacontent: { "160510020240": "418520,50" },
}, "10", "kabupaten");
lapor("data dinamis multidimensi terbaca", dynamic?.observations.length === 1);
lapor("  desimal dipertahankan sebagai string", dynamic?.observations[0]?.nilai === "418520.50");

const simdasi = uraiDataSimdasi({
  data: { rows: [{ tahun: "2025", kode_wilayah: "1605010", nama_wilayah: "STL Ulu Terawas", kategori: "Padi", nilai: "12,75" }] },
}, { wilayah: "1605000", tahun: 2025, idTabel: "contoh", wilayahLevel: "kecamatan" });
lapor("SIMDASI bertingkat terbaca", simdasi?.observations[0]?.wilayahKode === "1605010");
lapor("  dimensi SIMDASI dipertahankan", simdasi?.observations[0]?.dimensi.kategori === "Padi");

let halaman = 0;
globalThis.fetch = (async (input) => {
  halaman += 1;
  const isSecond = String(input).includes("/page/2/");
  return new Response(JSON.stringify({ status: "OK", data: [{ page: isSecond ? 2 : 1, pages: 2 }, [{ title: isSecond ? "Halaman Dua" : "Halaman Satu" }]] }));
}) as typeof fetch;
const paginated = await ambilPublikasiLangsung();
lapor("pagination diikuti sampai selesai", paginated?.length === 2 && halaman === 2);

// === B. Semua bentuk gagal -> null (bot memakai jawaban cadangan) ==========
//
// Tidak satu pun boleh melempar galat. Galat yang lolos akan membuat bot
// diam, dan warga tidak pernah tahu kenapa pesannya tidak dijawab.
console.log("\nB. BENTUK GAGAL - SEMUA HARUS null, TANPA MELEMPAR GALAT");

tiruJawaban({ status: "Error", message: "You are not Allowed to take this action. Please re-check your key" });
lapor("kunci ditolak BPS -> null", (await ambilPublikasiLangsung()) === null);

tiruJawaban(null, { teksMentah: "<!doctype html><title>Perimeter WAF Block</title>" });
lapor("diblokir penyaring bot (HTML, bukan JSON) -> null", (await ambilPublikasiLangsung()) === null);

tiruJawaban({ status: "OK" }, { status: 503 });
lapor("BPS sedang gangguan (HTTP 503) -> null", (await ambilPublikasiLangsung()) === null);

tiruJawaban({ status: "OK", data: "bentuk tak terduga" });
lapor("bentuk data berubah total -> larik kosong, bukan galat", (await ambilPublikasiLangsung())?.length === 0);

tiruJawaban({ status: "OK", data: [{ page: 1 }, [{ tanpa_judul: true }, { title: "Yang ini sah" }]] });
const campur = await ambilPublikasiLangsung();
lapor("entri rusak dilewati, entri sah tetap dipakai", campur?.length === 1 && campur[0].judul === "Yang ini sah");

globalThis.fetch = (async () => {
  throw new Error("getaddrinfo ENOTFOUND webapi.bps.go.id");
}) as typeof fetch;
lapor("jaringan putus -> null", (await ambilPublikasiLangsung()) === null);

globalThis.fetch = (async () => {
  const error = new Error("dibatalkan");
  error.name = "AbortError";
  throw error;
}) as typeof fetch;
lapor("timeout -> null", (await ambilPublikasiLangsung()) === null);

// === C. Tanpa kunci sama sekali ============================================
console.log("\nC. TANPA KUNCI");
delete process.env.BPS_WEBAPI_KEY;
let dipanggil = false;
globalThis.fetch = (async () => {
  dipanggil = true;
  return new Response("{}");
}) as typeof fetch;
lapor("tanpa kunci -> null", (await ambilPublikasiLangsung()) === null);
lapor("  dan TIDAK membuang permintaan ke BPS sama sekali", dipanggil === false);

globalThis.fetch = fetchAsli;

console.log(gagal === 0 ? "\nSEMUA UJI LULUS.\n" : `\n${gagal} UJI GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
