#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";

function gagal(message) {
  console.error(`GAGAL: ${message}`);
  process.exit(1);
}

const [sourceArg, level, codeProperty, nameProperty, parentProperty] = process.argv.slice(2);
if (!sourceArg || !["kecamatan", "desa"].includes(level) || !codeProperty || !nameProperty) {
  gagal("Pakai: npm run siapkan:geojson -- <sumber.geojson> <kecamatan|desa> <properti-kode> <properti-nama> [properti-induk]");
}
if (level === "desa" && !parentProperty) gagal("GeoJSON desa wajib menyebut properti kode kecamatan induk.");

const sourcePath = resolve(sourceArg);
const metadataPath = sourcePath.slice(0, -extname(sourcePath).length) + ".metadata.json";
let collection;
let metadata;
try {
  collection = JSON.parse(await readFile(sourcePath, "utf8"));
  metadata = JSON.parse(await readFile(metadataPath, "utf8"));
} catch (error) {
  gagal(`Berkas sumber atau metadata tidak dapat dibaca: ${error instanceof Error ? error.message : String(error)}`);
}
for (const field of ["sourceTitle", "sourceUrl", "license", "crs"]) {
  if (typeof metadata[field] !== "string" || !metadata[field].trim()) gagal(`Metadata ${field} wajib diisi.`);
}
if (!["EPSG:4326", "WGS84", "WGS 84"].includes(metadata.crs.toUpperCase())) gagal("CRS harus EPSG:4326 (WGS84).");
if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) gagal("Sumber harus berupa GeoJSON FeatureCollection.");

const codes = new Set();
function normalizeCoordinates(value) {
  if (!Array.isArray(value)) gagal("Koordinat GeoJSON tidak sah.");
  if (typeof value[0] === "number") {
    const [longitude, latitude] = value;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) gagal("Koordinat berada di luar rentang EPSG:4326.");
    return [Number(longitude.toFixed(5)), Number(latitude.toFixed(5))];
  }
  return value.map(normalizeCoordinates);
}

const features = collection.features.map((feature, index) => {
  if (feature?.type !== "Feature" || !["Polygon", "MultiPolygon"].includes(feature.geometry?.type)) gagal(`Fitur ke-${index + 1} bukan Polygon/MultiPolygon.`);
  const kode = String(feature.properties?.[codeProperty] ?? "").trim();
  const nama = String(feature.properties?.[nameProperty] ?? "").trim();
  const kodeInduk = level === "desa" ? String(feature.properties?.[parentProperty] ?? "").trim() : undefined;
  if (!kode || !nama) gagal(`Fitur ke-${index + 1} tidak memiliki kode atau nama.`);
  if (codes.has(kode)) gagal(`Kode wilayah duplikat: ${kode}.`);
  if (level === "desa" && !kodeInduk) gagal(`Desa ${kode} tidak memiliki kode induk.`);
  codes.add(kode);
  return {
    type: "Feature",
    properties: { kode, nama, level, ...(kodeInduk ? { kodeInduk } : {}) },
    geometry: { type: feature.geometry.type, coordinates: normalizeCoordinates(feature.geometry.coordinates) },
  };
});

const outputPath = resolve("public", "data", "wilayah", `musi-rawas-${level}.geojson`);
const outputMetadataPath = resolve("public", "data", "wilayah", `musi-rawas-${level}.metadata.json`);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({ type: "FeatureCollection", features }), "utf8");
await writeFile(outputMetadataPath, JSON.stringify({ ...metadata, sourceFile: basename(sourcePath), level, features: features.length }, null, 2), "utf8");
console.log(`OK: ${features.length} wilayah ditulis ke ${outputPath}`);
