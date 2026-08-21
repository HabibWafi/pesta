#!/usr/bin/env node
/**
 * Pemeriksaan cepat setelah deploy.
 *
 *   npm run cek:deploy -- https://bpskabmusirawas.com
 *   npm run cek:deploy                                  (bawaan: localhost:3000)
 *
 * Hanya memeriksa hal yang bisa diperiksa tanpa login. Butir yang perlu
 * masuk ke panel ada di checklist docs/DEPLOY.md.
 */

const dasar = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

const HIJAU = "\x1b[32m";
const MERAH = "\x1b[31m";
const KUNING = "\x1b[33m";
const NORMAL = "\x1b[0m";

let gagal = 0;

function lapor(nama, lulus, keterangan = "") {
  const tanda = lulus ? `${HIJAU}LULUS${NORMAL}` : `${MERAH}GAGAL${NORMAL}`;
  console.log(`  ${tanda}  ${nama}${keterangan ? ` ${KUNING}(${keterangan})${NORMAL}` : ""}`);
  if (!lulus) gagal += 1;
}

async function ambil(path, opsi = {}) {
  try {
    return await fetch(dasar + path, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      ...opsi,
    });
  } catch (error) {
    return { status: 0, gagalJaringan: String(error) };
  }
}

async function main() {
  console.log(`\nMemeriksa ${dasar}\n`);

  // --- Halaman publik ---
  const utama = await ambil("/");
  lapor("Halaman utama menjawab 200", utama.status === 200, `status ${utama.status}`);

  if (utama.status === 200) {
    const html = await utama.text();
    lapor(
      "Konten dari database ter-render di HTML sumber",
      html.includes("Alamat Kantor") && html.includes("Jam Layanan"),
      "penting untuk mesin pencari dan pembaca layar"
    );
    lapor("Peta lokasi terpasang", html.includes("Peta lokasi"));
    lapor(
      "Istilah lama sudah tidak ada",
      !html.includes("Form Mandiri PESTA") && !html.includes("Buat Laporan Mandiri")
    );
  }

  // --- Proteksi admin ---
  const dash = await ambil("/admin/dashboard");
  lapor(
    "Halaman admin dialihkan saat belum login",
    dash.status === 307 || dash.status === 302,
    `status ${dash.status}`
  );
  if (dash.headers?.get) {
    const tujuan = dash.headers.get("location") ?? "";
    lapor("Dialihkan ke halaman login", tujuan.includes("/admin/login"), tujuan || "tanpa Location");
  }

  const login = await ambil("/admin/login");
  lapor("Halaman login tetap terbuka", login.status === 200, `status ${login.status}`);

  // --- API ---
  for (const jalur of ["/api/admin/stats", "/api/admin/users", "/api/admin/konten"]) {
    const r = await ambil(jalur);
    lapor(`${jalur} menolak tanpa login`, r.status === 401, `status ${r.status}`);
  }

  const ekspor = await ambil("/api/admin/ekspor?jenis=vidcon");
  lapor("Ekspor CSV menolak tanpa login", ekspor.status === 401, `status ${ekspor.status}`);

  // --- Perekaman kunjungan ---
  const track = await ambil("/api/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
    },
    body: JSON.stringify({ path: "/cek-deploy" }),
  });
  lapor("Perekaman kunjungan aktif", track.status === 204, `status ${track.status}`);

  const bot = await ambil("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Googlebot/2.1" },
    body: JSON.stringify({ path: "/cek-bot" }),
  });
  lapor("Bot tetap dijawab 204 tanpa dicatat", bot.status === 204, `status ${bot.status}`);

  console.log("");
  if (gagal === 0) {
    console.log(`${HIJAU}Semua pemeriksaan otomatis lulus.${NORMAL}`);
    console.log("Lanjutkan dengan checklist yang butuh login di docs/DEPLOY.md.\n");
  } else {
    console.log(`${MERAH}${gagal} pemeriksaan gagal.${NORMAL}`);
    console.log("Lihat bagian 'Kalau terjadi masalah' di docs/DEPLOY.md.\n");
    process.exit(1);
  }
}

main();
