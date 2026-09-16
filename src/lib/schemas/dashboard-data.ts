import * as z from "zod";

/** Satu-satunya definisi bentuk data dashboard, dipakai route dan komponen. */
export const VISUALISASI_DATA = [
  "number",
  "line",
  "bar",
  "stacked",
  "composition",
  "map",
] as const;
export const LEVEL_WILAYAH = ["kabupaten", "kecamatan", "desa"] as const;
export const SUMBER_DATA = ["dynamic", "simdasi", "manual"] as const;

export const dimensiSchema = z.record(z.string(), z.string());

export const observasiDashboardSchema = z.object({
  id: z.number().int().positive(),
  periodeKode: z.string(),
  periode: z.string(),
  tahun: z.number().int(),
  wilayahKode: z.string(),
  wilayahNama: z.string(),
  wilayahLevel: z.enum(LEVEL_WILAYAH),
  dimensi: dimensiSchema,
  nilai: z.string(),
  satuan: z.string().nullable(),
  catatan: z.string().nullable(),
});

export const datasetRingkasSchema = z.object({
  id: z.number().int().positive(),
  kode: z.string(),
  slug: z.string(),
  nama: z.string(),
  tema: z.string(),
  satuan: z.string().nullable(),
  defaultView: z.enum(VISUALISASI_DATA),
  isFeatured: z.boolean(),
  featuredOrder: z.number().int(),
  highlightTitle: z.string().nullable(),
  highlightNote: z.string().nullable(),
  latestPeriod: z.string().nullable(),
  latestValue: z.string().nullable(),
  levels: z.array(z.enum(LEVEL_WILAYAH)),
  sourceUrl: z.string().nullable(),
  sourceUpdatedAt: z.string().nullable(),
});

export const datasetDetailSchema = z.object({
  dataset: datasetRingkasSchema.extend({
    definisi: z.string().nullable(),
    sumberPublikasi: z.string().nullable(),
  }),
  observations: z.array(observasiDashboardSchema),
  periods: z.array(z.object({ kode: z.string(), label: z.string() })),
  areas: z.array(
    z.object({ kode: z.string(), nama: z.string(), level: z.enum(LEVEL_WILAYAH) })
  ),
  dimensionOptions: z.record(z.string(), z.array(z.string())),
});

export type DatasetRingkas = z.infer<typeof datasetRingkasSchema>;
export type DatasetDetail = z.infer<typeof datasetDetailSchema>;
export type ObservasiDashboard = z.infer<typeof observasiDashboardSchema>;

export const datasetAdminUpdateSchema = z.object({
  nama: z.string().trim().min(3).max(200),
  tema: z.string().trim().min(2).max(60),
  definisi: z.string().trim().max(4000).nullable().optional(),
  satuan: z.string().trim().max(40).nullable().optional(),
  sourceType: z.enum(SUMBER_DATA),
  sourceRef: z.string().trim().max(191).nullable().optional(),
  sourceConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  sourceUrl: z.string().trim().url().max(300).nullable().optional(),
  defaultView: z.enum(VISUALISASI_DATA),
  isFeatured: z.boolean(),
  featuredOrder: z.number().int().min(0).max(999),
  highlightTitle: z.string().trim().max(160).nullable().optional(),
  highlightNote: z.string().trim().max(1000)
    .refine((value) => !/\d/.test(value), "Catatan highlight tidak boleh memuat angka; nilai harus berasal dari observasi.")
    .nullable().optional(),
  isActive: z.boolean(),
  syncEnabled: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.sourceType === "manual" && value.syncEnabled) {
    ctx.addIssue({
      code: "custom",
      path: ["syncEnabled"],
      message: "Dataset manual tidak dapat memakai sinkronisasi otomatis.",
    });
    return;
  }

  if (!value.syncEnabled) return;
  if (!value.sourceRef) {
    ctx.addIssue({
      code: "custom",
      path: ["sourceRef"],
      message: "ID variabel atau tabel wajib diisi sebelum sinkronisasi diaktifkan.",
    });
  }

  const hasil = value.sourceType === "dynamic"
    ? bpsDynamicConfigSchema.safeParse(value.sourceConfig ?? {})
    : bpsSimdasiConfigSchema.safeParse(value.sourceConfig ?? {});
  if (!hasil.success) {
    ctx.addIssue({
      code: "custom",
      path: ["sourceConfig"],
      message: value.sourceType === "dynamic"
        ? "Konfigurasi data dinamis wajib memuat th dan wilayahLevel yang sah."
        : "Konfigurasi SIMDASI wajib memuat wilayah, tahun, dan wilayahLevel yang sah.",
    });
  }
});

export const bpsDynamicConfigSchema = z.object({
  th: z.string().trim().min(1),
  turvar: z.string().trim().optional(),
  vervar: z.string().trim().optional(),
  turth: z.string().trim().optional(),
  wilayahLevel: z.enum(LEVEL_WILAYAH).default("kabupaten"),
});

export const bpsSimdasiConfigSchema = z.object({
  wilayah: z.string().trim().min(1),
  tahun: z.coerce.number().int().min(2000).max(2200),
  idTabel: z.string().trim().min(1).max(191),
  wilayahLevel: z.enum(LEVEL_WILAYAH).default("kabupaten"),
});

export const dashboardFilterSchema = z.object({
  period: z.string().trim().min(1).max(40).optional(),
  areaLevel: z.enum(LEVEL_WILAYAH).optional(),
  areaCode: z.string().trim().min(1).max(30).optional(),
  dimensions: z.record(
    z.string().trim().min(1).max(80),
    z.string().trim().min(1).max(160)
  ).default({}),
});

export type DashboardFilter = z.infer<typeof dashboardFilterSchema>;

export const dashboardCatalogFilterSchema = z.object({
  q: z.string().trim().max(120).default(""),
  tema: z.string().trim().max(60).default(""),
  featured: z.enum(["0", "1"]).default("0"),
}).strict();

export const datasetReviewSchema = z.object({
  note: z.string().trim().min(3, "Catatan peninjauan minimal 3 karakter.").max(1000),
});

const nilaiDesimalSchema = z.string().trim().regex(
  /^-?\d+(?:\.\d{1,4})?$/,
  "Nilai harus berupa desimal dengan paling banyak empat angka di belakang titik."
);

export const manualObservationSchema = z.object({
  periodeKode: z.string().trim().min(1).max(40),
  periode: z.string().trim().min(1).max(20),
  tahun: z.number().int().min(1900).max(2200),
  wilayahKode: z.string().trim().min(1).max(20),
  wilayahNama: z.string().trim().min(1).max(100),
  wilayahLevel: z.enum(LEVEL_WILAYAH),
  dimensi: dimensiSchema.default({}),
  nilai: nilaiDesimalSchema,
});

export const manualDatasetImportSchema = z.object({
  datasetId: z.number().int().positive(),
  sumberPublikasi: z.string().trim().min(3).max(200),
  sourceUrl: z.string().trim().url().max(300),
  sourceUpdatedAt: z.iso.datetime({ offset: true }).nullable().default(null),
  catatan: z.string().trim().max(2000).nullable().default(null),
  observations: z.array(manualObservationSchema).min(1).max(5000),
});

export type ManualDatasetImport = z.infer<typeof manualDatasetImportSchema>;
