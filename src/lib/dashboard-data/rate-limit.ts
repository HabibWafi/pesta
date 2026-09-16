import { bacaIp, sidikPengunjung } from "@/lib/analytics";

interface EmberPermintaan {
  jumlah: number;
  resetPada: number;
}

const BATAS_PER_MENIT = 120;
const JENDELA_MS = 60_000;

const globalLimit = globalThis as unknown as {
  pestaDashboardLimit?: Map<string, EmberPermintaan>;
};

function penyimpanan(): Map<string, EmberPermintaan> {
  globalLimit.pestaDashboardLimit ??= new Map();
  return globalLimit.pestaDashboardLimit;
}

function bersihkan(sekarang: number): void {
  const map = penyimpanan();
  if (map.size < 1000) return;
  for (const [key, value] of map) {
    if (value.resetPada <= sekarang) map.delete(key);
  }
}

/**
 * Pembatas ringan untuk API publik Dashboard Data.
 *
 * Kunci memakai sidik harian yang sama dengan analitik. Alamat IP mentah
 * hanya dibaca untuk membentuk hash lalu dibuang; tidak masuk log atau basis
 * data dan tidak dapat dirangkai lintas hari.
 */
export function periksaBatasDashboard(req: Request): {
  boleh: boolean;
  sisa: number;
  ulangDetik: number;
} {
  const sekarang = Date.now();
  bersihkan(sekarang);
  const userAgent = req.headers.get("user-agent") ?? "tanpa-user-agent";
  const key = sidikPengunjung(bacaIp(req.headers), userAgent);
  const map = penyimpanan();
  const current = map.get(key);
  const bucket = !current || current.resetPada <= sekarang
    ? { jumlah: 0, resetPada: sekarang + JENDELA_MS }
    : current;

  bucket.jumlah += 1;
  map.set(key, bucket);
  return {
    boleh: bucket.jumlah <= BATAS_PER_MENIT,
    sisa: Math.max(0, BATAS_PER_MENIT - bucket.jumlah),
    ulangDetik: Math.max(1, Math.ceil((bucket.resetPada - sekarang) / 1000)),
  };
}

export function headerBatasDashboard(result: ReturnType<typeof periksaBatasDashboard>): HeadersInit {
  return {
    "X-RateLimit-Limit": String(BATAS_PER_MENIT),
    "X-RateLimit-Remaining": String(result.sisa),
    ...(result.boleh ? {} : { "Retry-After": String(result.ulangDetik) }),
  };
}
