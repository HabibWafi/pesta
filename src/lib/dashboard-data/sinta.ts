import type { IndicatorQuery, VerifiedFact } from "@/lib/beregam/contracts";
import { getDatasetDetail } from "./queries";

export interface ResolvedIndicatorQuery {
  facts: VerifiedFact[];
  narrativeContext: Array<{ token: string; label: string }>;
  limitation: string | null;
}

function token(index: number): string {
  return `[[FAKTA_${index + 1}]]`;
}

function withoutDigits(value: string): string {
  return value.replace(/[0-9]+/g, "").replace(/\s+/g, " ").trim();
}

function compareDecimal(a: string, b: string): number {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return a.localeCompare(b);
  return left - right;
}

function subtractDecimal(left: string, right: string): string {
  const parse = (value: string) => {
    const match = value.match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (!match) return null;
    return { negative: match[1] === "-", integer: match[2], fraction: match[3] ?? "" };
  };
  const a = parse(left); const b = parse(right);
  if (!a || !b) throw new Error("Nilai perbandingan bukan desimal yang sah.");
  const scale = Math.max(a.fraction.length, b.fraction.length);
  const toInteger = (item: NonNullable<ReturnType<typeof parse>>) => {
    const magnitude = BigInt(`${item.integer}${item.fraction.padEnd(scale, "0")}`);
    return item.negative ? -magnitude : magnitude;
  };
  const difference = toInteger(a) - toInteger(b);
  const negative = difference < BigInt(0);
  const digits = (negative ? -difference : difference).toString().padStart(scale + 1, "0");
  if (!scale) return `${negative ? "-" : ""}${digits}`;
  const integer = digits.slice(0, -scale);
  const fraction = digits.slice(-scale).replace(/0+$/, "");
  return `${negative ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
}

/**
 * Resolver bersama dashboard dan SINTA. Ia hanya dapat membaca versi publik
 * yang observasinya sudah mempunyai verifier melalui getDatasetDetail().
 */
export async function resolveIndicatorQuery(query: IndicatorQuery): Promise<ResolvedIndicatorQuery> {
  const detail = await getDatasetDetail(query.dataset);
  if (!detail) return { facts: [], narrativeContext: [], limitation: "Indikator tidak tersedia atau belum diverifikasi." };

  let rows = detail.observations.filter((row) =>
    (!query.wilayah?.level || row.wilayahLevel === query.wilayah.level) &&
    (!query.wilayah?.codes.length || query.wilayah.codes.includes(row.wilayahKode)) &&
    (!query.periode?.codes.length || query.periode.codes.includes(row.periodeKode)) &&
    Object.entries(query.dimensi).every(([key, value]) => row.dimensi[key] === value)
  );
  if (!rows.length) return { facts: [], narrativeContext: [], limitation: "Data terverifikasi untuk wilayah, periode, atau dimensi tersebut tidak tersedia." };

  rows = [...rows].sort((a, b) => a.tahun - b.tahun || a.periodeKode.localeCompare(b.periodeKode));
  if (query.operation === "lookup") rows = [rows.at(-1)!];
  if (query.operation === "compare") rows = rows.slice(-2);
  if (query.operation === "rank") {
    const lastPeriod = query.periode?.codes.at(-1) ?? rows.at(-1)!.periodeKode;
    rows = rows.filter((row) => row.periodeKode === lastPeriod)
      .sort((a, b) => compareDecimal(b.nilai, a.nilai));
  }
  rows = rows.slice(0, query.limit);

  const facts: VerifiedFact[] = rows.map((row, index) => ({
    token: token(index),
    nilai: row.nilai,
    satuan: row.satuan,
    periode: row.periode,
    wilayah: row.wilayahNama,
    judulSumber: detail.dataset.sumberPublikasi ?? detail.dataset.nama,
    urlSumber: detail.dataset.sourceUrl,
  }));
  const narrativeContext = rows.map((row, index) => ({
    token: token(index),
    label: withoutDigits(`${detail.dataset.nama}; ${row.wilayahNama}; ${Object.entries(row.dimensi).map(([key, value]) => `${key} ${value}`).join("; ")}`),
  }));
  if (query.operation === "compare" && rows.length === 2) {
    const index = facts.length;
    facts.push({
      token: token(index),
      nilai: subtractDecimal(rows[1].nilai, rows[0].nilai),
      satuan: rows[1].satuan,
      periode: `${rows[0].periode} dibanding ${rows[1].periode}`,
      wilayah: rows[1].wilayahNama,
      judulSumber: `Perhitungan kode dari ${detail.dataset.sumberPublikasi ?? detail.dataset.nama}`,
      urlSumber: detail.dataset.sourceUrl,
    });
    narrativeContext.push({ token: token(index), label: withoutDigits(`Selisih terhitung ${detail.dataset.nama} ${rows[1].wilayahNama}`) });
  }
  return { facts, narrativeContext, limitation: null };
}

function renderFact(fact: VerifiedFact): string {
  return `${fact.nilai}${fact.satuan ? ` ${fact.satuan}` : ""} (${fact.periode}, ${fact.wilayah})`;
}

/**
 * Menolak angka dan token asing dari keluaran model, lalu baru menyisipkan
 * nilai asli. Dengan demikian model tidak pernah menjadi sumber angka.
 */
export function renderVerifiedNarrative(template: string, facts: VerifiedFact[]): string {
  const byToken = new Map(facts.map((fact) => [fact.token, fact]));
  const mentioned = template.match(/\[\[[A-Z_0-9]+\]\]/g) ?? [];
  if (mentioned.some((item) => !byToken.has(item))) throw new Error("Narasi model memuat token fakta asing.");
  const withoutFactTokens = template.replace(/\[\[FAKTA_[1-9][0-9]*\]\]/g, "");
  if (/\d/.test(withoutFactTokens)) throw new Error("Narasi model memuat digit di luar token fakta.");
  const narrative = [...byToken].reduce((text, [factToken, fact]) => text.replaceAll(factToken, renderFact(fact)), template);
  const sources = [...new Map(facts.map((fact) => [fact.urlSumber ?? fact.judulSumber, fact])).values()]
    .map((fact) => fact.urlSumber ? `${fact.judulSumber}: ${fact.urlSumber}` : fact.judulSumber);
  return sources.length ? `${narrative}\n\nSumber: ${sources.join("; ")}` : narrative;
}
