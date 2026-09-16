#!/usr/bin/env node
import { indicatorQuerySchema, type VerifiedFact } from "../../src/lib/beregam/contracts.js";
import { renderVerifiedNarrative } from "../../src/lib/dashboard-data/sinta.js";
import { filterDashboardObservations, parseDashboardFilters } from "../../src/lib/dashboard-data/filter.js";
import {
  datasetAdminUpdateSchema,
  datasetReviewSchema,
  manualDatasetImportSchema,
  type ObservasiDashboard,
} from "../../src/lib/schemas/dashboard-data.js";
import { bangunCsv } from "../../src/lib/csv.js";
import { readFileSync } from "node:fs";

let gagal = 0;
function lapor(nama: string, lulus: boolean) {
  console.log(`  ${lulus ? "LULUS" : "GAGAL"}  ${nama}`);
  if (!lulus) gagal += 1;
}
function menolak(run: () => unknown): boolean {
  try { run(); return false; } catch { return true; }
}

console.log("\nUji pagar Dashboard Data dan SINTA\n");
const parsed = indicatorQuerySchema.safeParse({ dataset: "jumlah-penduduk", operation: "trend", dimensi: {}, limit: 10 });
lapor("query terstruktur yang di-whitelist diterima", parsed.success);
lapor("operasi di luar whitelist ditolak", !indicatorQuerySchema.safeParse({ dataset: "x", operation: "sql", dimensi: {} }).success);

const facts: VerifiedFact[] = [{
  token: "[[FAKTA_1]]",
  nilai: "418520.50",
  satuan: "Jiwa",
  periode: "2026",
  wilayah: "Kabupaten Musi Rawas",
  judulSumber: "BPS Kabupaten Musi Rawas",
  urlSumber: "https://musirawaskab.bps.go.id/",
}];
const rendered = renderVerifiedNarrative("Nilai terverifikasi adalah [[FAKTA_1]].", facts);
lapor("token diganti nilai asli oleh kode", rendered.includes("418520.50 Jiwa"));
lapor("sumber otomatis disertakan", rendered.includes("musirawaskab.bps.go.id"));
lapor("digit tambahan dari model ditolak", menolak(() => renderVerifiedNarrative("Nilai tahun 2026 adalah [[FAKTA_1]].", facts)));
lapor("token asing dari model ditolak", menolak(() => renderVerifiedNarrative("Nilai [[FAKTA_2]].", facts)));

const rows: ObservasiDashboard[] = [
  { id: 1, periodeKode: "2025", periode: "2025", tahun: 2025, wilayahKode: "1605", wilayahNama: "Musi Rawas", wilayahLevel: "kabupaten", dimensi: { jenis: "Laki-laki" }, nilai: "10", satuan: "Jiwa", catatan: null },
  { id: 2, periodeKode: "2026", periode: "2026", tahun: 2026, wilayahKode: "1605", wilayahNama: "Musi Rawas", wilayahLevel: "kabupaten", dimensi: { jenis: "Perempuan" }, nilai: "11", satuan: "Jiwa", catatan: null },
];
const filtered = filterDashboardObservations(rows, new URLSearchParams({ period: "2026", "dim.jenis": "Perempuan" }));
lapor("filter bersama JSON/CSV memilih observasi identik", filtered.length === 1 && filtered[0].nilai === "11");
lapor("filter publik yang tidak dikenal ditolak", menolak(() => parseDashboardFilters(new URLSearchParams({ sql: "select" }))));

const csv = bangunCsv(["Nilai", "Catatan"], [["-12.5", "=HYPERLINK(\"https://contoh.invalid\")"]]);
lapor("CSV mempertahankan angka negatif", csv.includes("-12.5"));
lapor("CSV menetralkan formula spreadsheet", csv.includes("'=HYPERLINK"));

lapor("sinkronisasi tanpa konfigurasi sumber ditolak", !datasetAdminUpdateSchema.safeParse({
  nama: "Indikator Uji", tema: "Uji", definisi: null, satuan: "Unit",
  sourceType: "dynamic", sourceRef: "1", sourceConfig: {}, sourceUrl: null,
  defaultView: "line", isFeatured: false, featuredOrder: 0,
  highlightTitle: null, highlightNote: null, isActive: true, syncEnabled: true,
}).success);
lapor("catatan review kosong ditolak", !datasetReviewSchema.safeParse({ note: "" }).success);
lapor("impor manual tervalidasi", manualDatasetImportSchema.safeParse({
  datasetId: 1,
  sumberPublikasi: "BPS Kabupaten Musi Rawas",
  sourceUrl: "https://musirawaskab.bps.go.id/",
  sourceUpdatedAt: "2026-09-16T00:00:00+07:00",
  catatan: "Sumber resmi",
  observations: [{
    periodeKode: "2026", periode: "2026", tahun: 2026,
    wilayahKode: "1605", wilayahNama: "Kabupaten Musi Rawas",
    wilayahLevel: "kabupaten", dimensi: {}, nilai: "1.25",
  }],
}).success);

const migration = readFileSync(new URL("../migrations/0010_dashboard_data.sql", import.meta.url), "utf8");
lapor("migration melakukan backfill sebelum kolom diwajibkan", migration.indexOf("UPDATE `beregam_indikator`") < migration.indexOf("MODIFY `dataset_id` int NOT NULL"));
lapor("keunikan observasi memakai hash dimensi tetap", migration.includes("`dataset_id`,`version_id`,`wilayah_kode`,`periode_kode`,`dimensi_hash`"));
lapor("paket awal tepat 23 indikator", (migration.match(/^\s*\('[A-Z0-9_]+','/gm) ?? []).length === 23);

console.log(gagal === 0 ? "\nSEMUA UJI LULUS.\n" : `\n${gagal} UJI GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
