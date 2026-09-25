import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Hostinger dapat mewariskan NODE_ENV nonstandar ke proses build. Next.js
 * hanya mendukung "development", "production", atau "test"; nilai lain
 * membuat perilaku Turbopack tidak konsisten, terutama pada pemrosesan font.
 *
 * Jalankan CLI Next melalui Node agar cara ini sama di Windows dan Linux,
 * tanpa menambah dependency seperti cross-env.
 */
const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url)
);

// Hostinger dapat memakai ulang direktori aplikasi antar deployment. Buang
// hasil Turbopack lama agar modul font atau route dari commit sebelumnya tidak
// ikut terbaca pada build baru.
rmSync(resolve(process.cwd(), ".next"), { recursive: true, force: true });

const hasil = spawnSync(process.execPath, [nextCli, "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
});

if (hasil.error) {
  console.error("Gagal menjalankan build Next.js:", hasil.error.message);
  process.exit(1);
}

process.exit(hasil.status ?? 1);
