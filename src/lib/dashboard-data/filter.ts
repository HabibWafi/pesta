import {
  dashboardFilterSchema,
  type DashboardFilter,
  type ObservasiDashboard,
} from "@/lib/schemas/dashboard-data";

const KUNCI_FILTER = new Set(["period", "areaLevel", "areaCode"]);

export class DashboardFilterError extends Error {
  constructor(message = "Filter dashboard tidak sah.") {
    super(message);
    this.name = "DashboardFilterError";
  }
}

/** Menormalkan dan memvalidasi filter yang dipakai respons JSON maupun CSV. */
export function parseDashboardFilters(params: URLSearchParams): DashboardFilter {
  const dimensions: Record<string, string> = {};
  const raw: Record<string, unknown> = { dimensions };

  for (const [key, value] of params.entries()) {
    if (KUNCI_FILTER.has(key)) {
      if (raw[key] !== undefined) throw new DashboardFilterError(`Filter ${key} tidak boleh diulang.`);
      raw[key] = value;
      continue;
    }
    if (!key.startsWith("dim.")) {
      throw new DashboardFilterError(`Filter ${key} tidak dikenal.`);
    }
    const dimensionKey = key.slice(4);
    if (!dimensionKey || dimensions[dimensionKey] !== undefined) {
      throw new DashboardFilterError("Nama dimensi kosong atau berulang.");
    }
    dimensions[dimensionKey] = value;
  }

  const parsed = dashboardFilterSchema.safeParse(raw);
  if (!parsed.success) throw new DashboardFilterError();
  return parsed.data;
}

/** Filter tunggal untuk JSON dan CSV agar keduanya tidak mungkin berbeda. */
export function filterDashboardObservations(
  rows: ObservasiDashboard[],
  input: URLSearchParams | DashboardFilter
): ObservasiDashboard[] {
  const filters = input instanceof URLSearchParams ? parseDashboardFilters(input) : input;
  return rows.filter((item) =>
    (!filters.period || item.periodeKode === filters.period) &&
    (!filters.areaLevel || item.wilayahLevel === filters.areaLevel) &&
    (!filters.areaCode || item.wilayahKode === filters.areaCode) &&
    Object.entries(filters.dimensions).every(([key, value]) => item.dimensi[key] === value)
  );
}
