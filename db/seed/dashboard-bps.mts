/**
 * Impor hasil penelusuran tabel resmi BPS ke alur versi dashboard.
 * Tanpa --publish, hanya membuat draf. Tidak pernah menimpa versi aktif.
 * npm run db:seed:dashboard -- --reviewer 1 --publish --enable
 * --enable mengaktifkan menu lokal setelah seluruh impor berhasil.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { escape } from "mysql2";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../../src/lib/db/index.js";
import { users, siteSettings } from "../../src/lib/db/schema.js";
import { beregamDatasets, beregamDatasetVersions, beregamIndikator, beregamDataAudit } from "../../src/lib/beregam/db/schema.js";
import { manualDatasetImportSchema } from "../../src/lib/schemas/dashboard-data.js";

const source: {
  accessedAt: string;
  population: { year: number; sourceUpdatedAt: string; sourceUrl: string; sourceTitle: string; note: string; total: string; male: string; female: string; ages: string[][] };
  poverty: { year: number; sourceUpdatedAt: string; count: string; percent: string; countUrl: string; percentUrl: string };
} = JSON.parse(readFileSync(new URL("../data/dashboard-bps-2026.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);
const reviewer = Number(args[args.indexOf("--reviewer") + 1]);
const publish = args.includes("--publish");
const enable = args.includes("--enable");
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const p = source.population;
const k = source.poverty;
const definitions = [
  { kode: "PENDUDUK_TOTAL", slug: "jumlah-penduduk", nama: "Jumlah Penduduk", tema: "Kependudukan", satuan: "Ribu jiwa", definisi: "Jumlah penduduk Kabupaten Musi Rawas berdasarkan proyeksi hasil Sensus Penduduk. Angka sumber disajikan dalam ribu jiwa.", sourceUrl: p.sourceUrl, sourceUpdatedAt: p.sourceUpdatedAt, sourceTitle: p.sourceTitle, note: p.note, year: p.year, view: "number" as const, featured: 1, values: [{ dimensi: {}, nilai: p.total }] },
  { kode: "PENDUDUK_JK", slug: "penduduk-jenis-kelamin", nama: "Penduduk Menurut Jenis Kelamin", tema: "Kependudukan", satuan: "Ribu jiwa", definisi: "Jumlah penduduk laki-laki dan perempuan. Rincian disalin dari tabel sumber tanpa menghitung ulang totalnya.", sourceUrl: p.sourceUrl, sourceUpdatedAt: p.sourceUpdatedAt, sourceTitle: p.sourceTitle, note: p.note, year: p.year, view: "bar" as const, featured: 0, values: [{ dimensi: { "Jenis kelamin": "Laki-laki" }, nilai: p.male }, { dimensi: { "Jenis kelamin": "Perempuan" }, nilai: p.female }] },
  { kode: "PENDUDUK_UMUR", slug: "penduduk-kelompok-umur", nama: "Penduduk Menurut Kelompok Umur", tema: "Kependudukan", satuan: "Ribu jiwa", definisi: "Jumlah penduduk menurut kelompok umur lima tahunan dan jenis kelamin. Kategori Total adalah total resmi setiap kelompok umur, bukan penjumlahan ulang rincian yang telah dibulatkan.", sourceUrl: p.sourceUrl, sourceUpdatedAt: p.sourceUpdatedAt, sourceTitle: p.sourceTitle, note: p.note, year: p.year, view: "bar" as const, featured: 0, values: p.ages.flatMap(([umur, male, female, total]) => [{ dimensi: { "Kelompok umur": umur, "Jenis kelamin": "Laki-laki" }, nilai: male }, { dimensi: { "Kelompok umur": umur, "Jenis kelamin": "Perempuan" }, nilai: female }, { dimensi: { "Kelompok umur": umur, "Jenis kelamin": "Total" }, nilai: total }]) },
  { kode: "MISKIN_TOTAL", slug: "jumlah-penduduk-miskin", nama: "Jumlah Penduduk Miskin", tema: "Kemiskinan", satuan: "Ribu jiwa", definisi: "Jumlah penduduk yang memiliki rata-rata pengeluaran per kapita per bulan di bawah garis kemiskinan.", sourceUrl: k.countUrl, sourceUpdatedAt: k.sourceUpdatedAt, sourceTitle: "Jumlah Penduduk Miskin (Ribu Jiwa), 2024", note: "Periode data sesuai tabel BPS yang berhasil diverifikasi; tidak menyatakan angka ini sebagai rilis terkini.", year: k.year, view: "number" as const, featured: 2, values: [{ dimensi: {}, nilai: k.count }] },
  { kode: "MISKIN_PERSEN", slug: "persentase-penduduk-miskin", nama: "Persentase Penduduk Miskin", tema: "Kemiskinan", satuan: "Persen", definisi: "Persentase penduduk dengan rata-rata pengeluaran per kapita per bulan di bawah garis kemiskinan terhadap seluruh penduduk.", sourceUrl: k.percentUrl, sourceUpdatedAt: k.sourceUpdatedAt, sourceTitle: "Persentase Penduduk Miskin (Persen), 2024", note: "Periode data sesuai tabel BPS yang berhasil diverifikasi; tidak menyatakan angka ini sebagai rilis terkini.", year: k.year, view: "number" as const, featured: 3, values: [{ dimensi: {}, nilai: k.percent }] },
];

/** SQL data saja untuk phpMyAdmin; tidak membuat atau mengubah struktur tabel. */
function exportSql(destination: string) {
  const quote = (value: string | number | boolean | null) => escape(value);
  const sqlDate = (value: string) => quote(new Date(value).toISOString().slice(0, 23).replace("T", " "));
  const sql = [
    "-- Paket data awal dashboard PESTA, sumber BPS. Tidak memuat kredensial.",
    "-- Backup dahulu. Pastikan migration 0010/0011 sudah diterapkan.",
    "-- Periksa SELECT VERSION() dan ID SUPERADMIN di database tujuan.",
    "-- Dataset yang sudah mempunyai versi tidak diubah. Aman diulang.",
    "SET NAMES utf8mb4;", "START TRANSACTION;",
    `SET @pesta_reviewer = (SELECT id FROM users WHERE id = ${reviewer} AND role = 'SUPERADMIN' LIMIT 1);`,
  ];
  for (const entry of definitions) {
    const observations = entry.values.map((value) => ({ ...value, periodeKode: String(entry.year), periode: String(entry.year), tahun: entry.year, wilayahKode: "1605", wilayahNama: "Kabupaten Musi Rawas", wilayahLevel: "kabupaten" }));
    // Validasi yang sama dengan impor lokal, memakai ID sementara hanya untuk validasi struktur.
    manualDatasetImportSchema.parse({ datasetId: 1, sumberPublikasi: entry.sourceTitle, sourceUrl: entry.sourceUrl, sourceUpdatedAt: entry.sourceUpdatedAt, catatan: entry.note, observations });
    const hash = digest(JSON.stringify({ kode: entry.kode, observations, sourceUrl: entry.sourceUrl }));
    const highlight = entry.tema === "Kependudukan" ? "Proyeksi penduduk hasil Sensus Penduduk." : "Penduduk dengan pengeluaran di bawah garis kemiskinan.";
    sql.push(
      `\n-- ${entry.nama}`,
      `INSERT INTO beregam_datasets (kode,slug,nama,tema,source_type,sync_enabled,created_at,updated_at) SELECT ${[entry.kode, entry.slug, entry.nama, entry.tema, "manual"].map(quote).join(",")},0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3) WHERE @pesta_reviewer IS NOT NULL AND NOT EXISTS (SELECT 1 FROM beregam_datasets WHERE kode = ${quote(entry.kode)});`,
      `SET @pesta_dataset = (SELECT id FROM beregam_datasets WHERE kode = ${quote(entry.kode)} LIMIT 1);`,
      "SELECT id FROM beregam_datasets WHERE id = @pesta_dataset FOR UPDATE;",
      "SET @pesta_import = (@pesta_reviewer IS NOT NULL AND @pesta_dataset IS NOT NULL AND NOT EXISTS (SELECT 1 FROM beregam_dataset_versions WHERE dataset_id = @pesta_dataset));",
      `UPDATE beregam_datasets SET nama=${quote(entry.nama)},definisi=${quote(entry.definisi)},tema=${quote(entry.tema)},satuan=${quote(entry.satuan)},source_type='manual',source_url=${quote(entry.sourceUrl)},sync_enabled=0,default_view=${quote(entry.view)},is_featured=${entry.featured > 0 ? 1 : 0},featured_order=${entry.featured},highlight_title=${quote(entry.nama)},highlight_note=${quote(highlight)},is_active=1,updated_at=UTC_TIMESTAMP(3) WHERE id=@pesta_dataset AND @pesta_import=1;`,
      `INSERT INTO beregam_dataset_versions (dataset_id,status,content_hash,source_updated_at,fetched_at,created_at,summary) SELECT @pesta_dataset,'draft',${quote(hash)},${sqlDate(entry.sourceUpdatedAt)},UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),${quote(JSON.stringify({ observations: observations.length, added: observations.length, changed: 0, removed: 0 }))} WHERE @pesta_import=1;`,
      `SET @pesta_version = (SELECT id FROM beregam_dataset_versions WHERE dataset_id=@pesta_dataset AND content_hash=${quote(hash)} LIMIT 1);`,
    );
    for (const item of observations) {
      const ref = entry.sourceUrl.includes("/3/") ? "bps-tabel-umur-2026" : entry.kode;
      sql.push(`INSERT INTO beregam_indikator (dataset_id,version_id,kode,nama,satuan,wilayah_kode,wilayah_nama,wilayah_level,tahun,periode,periode_kode,dimensi,dimensi_hash,nilai,sumber_publikasi,source_ref,source_url,source_updated_at,catatan,verified_by,created_at,updated_at) SELECT @pesta_dataset,@pesta_version,${[entry.kode, entry.nama, entry.satuan, item.wilayahKode, item.wilayahNama, item.wilayahLevel, item.tahun, item.periode, item.periodeKode, JSON.stringify(item.dimensi), digest(JSON.stringify(item.dimensi)), item.nilai, entry.sourceTitle, ref, entry.sourceUrl].map(quote).join(",")},${sqlDate(entry.sourceUpdatedAt)},${quote(entry.note)},NULL,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3) WHERE @pesta_import=1;`);
    }
    sql.push(`INSERT INTO beregam_data_audit (dataset_id,version_id,action,actor_id,note,created_at) SELECT @pesta_dataset,@pesta_version,'import_manual_draft',@pesta_reviewer,${quote(`Transkripsi tabel resmi BPS, diakses ${source.accessedAt}. ${entry.sourceUrl}`)},UTC_TIMESTAMP(3) WHERE @pesta_import=1;`);
    if (publish) sql.push(
      "UPDATE beregam_indikator SET verified_by=@pesta_reviewer,updated_at=UTC_TIMESTAMP(3) WHERE version_id=@pesta_version AND @pesta_import=1;",
      `UPDATE beregam_dataset_versions SET status='published',reviewed_at=UTC_TIMESTAMP(3),reviewed_by=@pesta_reviewer,review_note=${quote(`Publikasi paket awal atas permintaan pemilik PESTA. Sumber diperiksa ${source.accessedAt}; periode dan satuan dipertahankan.`)} WHERE id=@pesta_version AND @pesta_import=1;`,
      "INSERT INTO beregam_data_audit (dataset_id,version_id,action,actor_id,note,created_at) SELECT @pesta_dataset,@pesta_version,'publish_version',@pesta_reviewer,'Publikasi paket data awal dari tabel resmi BPS melalui phpMyAdmin.',UTC_TIMESTAMP(3) WHERE @pesta_import=1;",
    );
  }
  if (enable) sql.push(`INSERT INTO site_settings (setting_key,setting_value,grup,updated_by,created_at,updated_at) SELECT 'tampilan.dashboard','true','tampilan',@pesta_reviewer,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3) WHERE @pesta_reviewer IS NOT NULL AND (SELECT COUNT(DISTINCT d.kode) FROM beregam_datasets d JOIN beregam_dataset_versions v ON v.dataset_id=d.id AND v.status='published' WHERE d.is_active=1 AND d.kode IN (${definitions.map((entry) => quote(entry.kode)).join(",")}))=${definitions.length} ON DUPLICATE KEY UPDATE setting_value='true',updated_by=@pesta_reviewer,updated_at=UTC_TIMESTAMP(3);`);
  sql.push("COMMIT;", `SELECT d.kode,d.nama,v.status,COUNT(i.id) AS observasi FROM beregam_datasets d LEFT JOIN beregam_dataset_versions v ON v.dataset_id=d.id AND v.status='published' LEFT JOIN beregam_indikator i ON i.version_id=v.id AND i.verified_by IS NOT NULL WHERE d.kode IN (${definitions.map((entry) => quote(entry.kode)).join(",")}) GROUP BY d.id,d.kode,d.nama,v.status;`);
  writeFileSync(resolve(destination), sql.join("\n") + "\n", "utf8");
  console.log(`SQL data ditulis: ${destination}. Struktur database tidak diubah.`);
}

async function main() {
  if (!args.includes("--reviewer") || !Number.isInteger(reviewer) || reviewer <= 0) throw new Error("Isi --reviewer dengan ID SUPERADMIN yang bertanggung jawab.");
  if (enable && !publish) throw new Error("--enable hanya boleh bersama --publish.");
  if (args.includes("--sql")) {
    const destination = args[args.indexOf("--sql") + 1];
    if (!destination || destination.startsWith("--")) throw new Error("Isi --sql dengan path berkas keluaran.");
    exportSql(destination);
    return;
  }
  const [actor] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, reviewer));
  if (actor?.role !== "SUPERADMIN") throw new Error("Reviewer harus SUPERADMIN yang sudah terdaftar.");
  for (const entry of definitions) {
    await db.transaction(async (tx) => {
      let [dataset] = await tx.select().from(beregamDatasets).where(eq(beregamDatasets.kode, entry.kode)).for("update");
      if (!dataset) {
        const [inserted] = await tx.insert(beregamDatasets).values({ kode: entry.kode, slug: entry.slug, nama: entry.nama, tema: entry.tema, sourceType: "manual", syncEnabled: false });
        [dataset] = await tx.select().from(beregamDatasets).where(eq(beregamDatasets.id, Number(inserted.insertId))).for("update");
      }
      const input = manualDatasetImportSchema.parse({ datasetId: dataset.id, sumberPublikasi: entry.sourceTitle, sourceUrl: entry.sourceUrl, sourceUpdatedAt: entry.sourceUpdatedAt, catatan: entry.note, observations: entry.values.map((value) => ({ ...value, periodeKode: String(entry.year), periode: String(entry.year), tahun: entry.year, wilayahKode: "1605", wilayahNama: "Kabupaten Musi Rawas", wilayahLevel: "kabupaten" })) });
      const hash = digest(JSON.stringify(input));
      let [version] = await tx.select().from(beregamDatasetVersions).where(and(eq(beregamDatasetVersions.datasetId, dataset.id), eq(beregamDatasetVersions.contentHash, hash)));
      if (version?.status === "published") { console.log(`${entry.slug}: sudah terpublikasi, dilewati.`); return; }
      const [active] = await tx.select({ id: beregamDatasetVersions.id }).from(beregamDatasetVersions).where(and(eq(beregamDatasetVersions.datasetId, dataset.id), eq(beregamDatasetVersions.status, "published")));
      if (active) throw new Error(`${entry.slug} sudah memiliki versi aktif lain. Tinjau perbedaan melalui admin sebelum menggantinya.`);
      if (version && version.status !== "draft") throw new Error(`${entry.slug}: versi lama berstatus ${version.status}; tinjau melalui admin.`);
      const now = new Date();
      if (!version) {
        const [inserted] = await tx.insert(beregamDatasetVersions).values({ datasetId: dataset.id, contentHash: hash, status: "draft", sourceUpdatedAt: new Date(entry.sourceUpdatedAt), fetchedAt: now, summary: { observations: input.observations.length, added: input.observations.length, changed: 0, removed: 0 } });
        const id = Number(inserted.insertId);
        await tx.insert(beregamIndikator).values(input.observations.map((item) => ({ ...item, datasetId: dataset.id, versionId: id, kode: entry.kode, nama: entry.nama, satuan: entry.satuan, dimensiHash: digest(JSON.stringify(item.dimensi)), sumberPublikasi: entry.sourceTitle, sourceRef: entry.sourceUrl.includes("/3/") ? "bps-tabel-umur-2026" : entry.kode, sourceUrl: entry.sourceUrl, sourceUpdatedAt: new Date(entry.sourceUpdatedAt), catatan: entry.note, verifiedBy: null })));
        [version] = await tx.select().from(beregamDatasetVersions).where(eq(beregamDatasetVersions.id, id));
        await tx.insert(beregamDataAudit).values({ datasetId: dataset.id, versionId: id, action: "import_manual_draft", actorId: reviewer, note: `Transkripsi tabel BPS, diakses ${source.accessedAt}. ${entry.note}`, after: { sourceUrl: entry.sourceUrl, observations: input.observations.length } });
      }
      // Metadata hanya diubah saat belum ada versi aktif agar draf tidak mengubah tampilan publik.
      await tx.update(beregamDatasets).set({ nama: entry.nama, definisi: entry.definisi, tema: entry.tema, satuan: entry.satuan, sourceType: "manual", sourceUrl: entry.sourceUrl, syncEnabled: false, defaultView: entry.view, isFeatured: entry.featured > 0, featuredOrder: entry.featured, highlightTitle: entry.nama, highlightNote: entry.tema === "Kependudukan" ? "Proyeksi penduduk hasil Sensus Penduduk." : "Penduduk dengan pengeluaran di bawah garis kemiskinan.", isActive: true }).where(eq(beregamDatasets.id, dataset.id));
      if (publish) {
        await tx.update(beregamIndikator).set({ verifiedBy: reviewer }).where(eq(beregamIndikator.versionId, version.id));
        await tx.update(beregamDatasetVersions).set({ status: "published", reviewedAt: now, reviewedBy: reviewer, reviewNote: `Pemeriksaan transkripsi terhadap tabel resmi BPS; impor awal atas permintaan pemilik PESTA. Sumber diakses ${source.accessedAt}.` }).where(eq(beregamDatasetVersions.id, version.id));
        await tx.insert(beregamDataAudit).values({ datasetId: dataset.id, versionId: version.id, action: "publish_version", actorId: reviewer, note: "Publikasi paket awal dari tabel resmi BPS. Periode, satuan, dan pembulatan dipertahankan." });
      }
      console.log(`${entry.slug}: ${input.observations.length} observasi, ${publish ? "published" : "draft"}.`);
    });
  }
  if (enable) {
    await db.insert(siteSettings).values({ key: "tampilan.dashboard", value: "true", grup: "tampilan", updatedBy: reviewer }).onDuplicateKeyUpdate({ set: { value: "true", updatedBy: reviewer } });
    console.log("Menu dashboard diaktifkan. Mulai ulang aplikasi agar cache katalog/pengaturan diperbarui.");
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Impor gagal."); process.exitCode = 1; }).finally(() => pool.end());
