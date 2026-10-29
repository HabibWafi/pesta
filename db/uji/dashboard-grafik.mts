import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataChart } from "../../src/app/dashboard/DataChart.js";
import type { ObservasiDashboard } from "../../src/lib/schemas/dashboard-data.js";

const source = JSON.parse(readFileSync(new URL("../data/dashboard-bps-2026.json", import.meta.url), "utf8")) as {
  population: { year: number; ages: string[][] };
};
const rows: ObservasiDashboard[] = source.population.ages.flatMap(([age, male, female, total], index) =>
  [male, female, total].map((nilai, gender) => ({
    id: index * 3 + gender + 1,
    periodeKode: String(source.population.year), periode: String(source.population.year), tahun: source.population.year,
    wilayahKode: "1605", wilayahNama: "Kabupaten Musi Rawas", wilayahLevel: "kabupaten" as const,
    dimensi: { "Kelompok umur": age, "Jenis kelamin": ["Laki-laki", "Perempuan", "Total"][gender] },
    nilai, satuan: "Ribu jiwa", catatan: null,
  })));
const render = (type: "line" | "bar" | "composition" | "number", observations = rows) => renderToStaticMarkup(createElement(DataChart, { type, rows: observations }));
assert.equal((render("bar").match(/<strong/g) ?? []).length, rows.length, "Grafik tidak boleh memotong observasi diam-diam.");
assert.ok(render("bar").includes("75+"), "Kelompok umur terakhir tetap ditampilkan.");
assert.ok(render("line").includes("memerlukan lebih dari satu periode"), "Satu tahun tidak boleh dibuat seolah tren.");
assert.ok(render("composition", rows.slice(0, 3)).includes("tanpa mencampurkan baris Total"), "Total tidak boleh dijumlah bersama rincian pada komposisi.");
assert.ok(render("composition", rows.slice(0, 2)).includes("<circle"), "Dua kategori pada satu periode/wilayah dapat divisualisasikan.");
assert.equal((render("number", rows.slice(0, 2)).match(/text-4xl/g) ?? []).length, 2, "Tampilan angka tidak boleh memilih observasi terakhir secara sewenang-wenang.");
assert.ok(render("bar", []).includes("Tidak ada nilai numerik"), "Filter kosong diberi keterangan.");
console.log("LULUS: cakupan grafik, kategori umur, tren, komposisi tanpa hitung ganda, angka majemuk, dan keadaan kosong.");
