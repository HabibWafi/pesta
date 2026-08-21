# PESTA

**Portal Pelayanan Statistik Digital — BPS Kabupaten Musi Rawas**

Website pelayanan publik yang berjalan di [bpskabmusirawas.com](https://bpskabmusirawas.com).
Warga dapat mendaftar konsultasi data virtual (ViDCon), menyampaikan aduan,
mengirim pesan ke Pelayanan Statistik Terpadu (PST), dan mengakses layanan
pendampingan inklusif — seluruhnya tanpa biaya.

Repositori ini juga memuat sisi server modul **Beregam** (bot WhatsApp dan
inbox layanan). Worker-nya ada di repositori terpisah:
[`HabibWafi/beregam`](https://github.com/HabibWafi/beregam).

---

## Stack

| Komponen | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Database | MySQL — Drizzle ORM |
| Styling | Tailwind CSS v4 |
| Validasi | Zod 4 + react-hook-form |
| Auth admin | JWT di cookie httpOnly, hash bcrypt |
| Hosting | Hostinger Business, runtime Node.js |

---

## Menjalankan di komputer sendiri

**Prasyarat:** Node.js 20+, MySQL 8 (mis. lewat Laragon).

```bash
npm install
```

Siapkan database dan konfigurasi:

```bash
cp .env.example .env
```

Isi `.env`, lalu bangkitkan `JWT_SECRET` sendiri:

```bash
openssl rand -hex 32
```

Impor struktur dan data awal ke database `pesta` lewat phpMyAdmin atau baris
perintah, memakai berkas di `db/seed/`. Setelah itu jalankan:

```bash
npm run dev
```

Situs terbuka di `http://localhost:3000`, panel admin di `/admin`.

---

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi — wajib hijau sebelum commit |
| `npm run lint` | ESLint |
| `npm run db:backup` | Dump database ke `db/backup/` |

---

## Struktur

```
src/
├── app/
│   ├── page.tsx           halaman utama
│   ├── admin/             panel administrator
│   └── api/               Route Handler
├── components/
│   ├── layout/            Navbar, Footer
│   ├── modals/            formulir ViDCon dan Aduan
│   ├── sections/          bagian-bagian halaman utama
│   └── ui/                komponen kecil bersama
└── lib/                   auth, koneksi database, skema Zod
```

---

## Backup

**Git menyimpan kode, bukan isi database.** Riwayat pesan kontak, permohonan
ViDCon, aduan, dan percakapan WhatsApp tidak ikut ter-push ke sini.

Jalankan `npm run db:backup` secara berkala dan **salin hasilnya ke luar
komputer**. Uji restore-nya sekali sebelum mengandalkannya — backup yang belum
pernah diuji bukan backup.

---

## Kontribusi

Baca [`CLAUDE.md`](CLAUDE.md) lebih dulu. Berkas itu memuat batasan lingkungan
Hostinger, aturan mutlak modul Beregam, dan konvensi proyek yang harus diikuti.

Dua yang paling sering dilanggar:

- **Satu skema Zod per domain di `src/lib/schemas/`**, diimpor bersama oleh
  form dan route API. Jangan mendefinisikan ulang di berkas berbeda.
- **Jangan pernah menaruh nilai rahasia di kode**, termasuk sebagai nilai
  cadangan.

---

## Lisensi

Perangkat lunak internal BPS Kabupaten Musi Rawas.
