# CLAUDE.md — PESTA & Beregam

Pedoman utama untuk siapa pun (manusia atau agen) yang mengerjakan repositori ini.
Baca seluruhnya sebelum menulis kode.

---

## Konteks

**PESTA** = website pelayanan digital BPS Kabupaten Musi Rawas, live di
`bpskabmusirawas.com`. Next.js App Router, deploy di **Hostinger Business**
dengan runtime Node.js, database **MySQL di host yang sama**.

**Beregam** = modul aditif: bot WhatsApp + inbox layanan + asisten berbasis
basis pengetahuan. Sisi servernya ada di repositori ini; worker-nya ada di
repositori terpisah [`HabibWafi/beregam`](https://github.com/HabibWafi/beregam)
dan berjalan di PC kantor.

Rancangan lengkap ada di `docs/plan.docx` pada repo `beregam`.

---

## Stack Nyata (hasil verifikasi, bukan asumsi)

| Komponen | Kenyataan |
|---|---|
| Framework | **Next.js 16.3.1**, App Router, Turbopack |
| React | 19.2.4 |
| TypeScript | 5.x, `strict: true` |
| Struktur | **`src/app/`, `src/lib/`, `src/components/`** — alias `@/*` → `./src/*` |
| ORM | **Drizzle ORM** *(migrasi dari Prisma, Tahap 1)* |
| Database | MySQL — lokal: Laragon **8.0.30** `localhost:3306/pesta`, `utf8mb4_unicode_ci` |
| Styling | Tailwind CSS v4 lewat `@tailwindcss/postcss` |
| Validasi | **Zod 4** |
| Form | react-hook-form + `@hookform/resolvers` |
| UI | lucide-react (ikon), sonner (toast), framer-motion (animasi) |
| Auth | JWT (`jsonwebtoken`) di cookie httpOnly `pesta_admin_token`, hash bcryptjs |

> **Panduan lama menyebut Drizzle, kode lama memakai Prisma.** Keputusan final:
> **Drizzle**. Alasannya `SELECT ... FOR UPDATE` (`.for('update')`) adalah fitur
> kelas satu di Drizzle dan jadi inti pola outbox Beregam.

> **Panduan menulis path `app/` dan `lib/`.** Di proyek ini semuanya di bawah
> `src/`. Terjemahkan setiap path dari panduan.

---

## Batasan Lingkungan

### Hostinger Business
- **TIDAK ADA Docker, TIDAK ADA root**, tidak ada proses tambahan di luar
  aplikasi Next.js
- Ada batas **Entry Process**. Jangan membuka banyak koneksi persisten;
  `connectionLimit` pool MySQL dijaga kecil (kira-kira 5)
- Migration dijalankan lewat **phpMyAdmin**, bukan CLI. Alurnya:
  `drizzle-kit generate` di lokal, salin SQL, jalankan di phpMyAdmin
- **Jangan** membuat endpoint migration sekali-pakai — itu lubang keamanan
- Cron hPanel tersedia tapi **jangan dijadikan andalan**. Pemeliharaan dipicu
  dari heartbeat worker
- **TIDAK ADA model AI yang jalan di server ini.** Semua inferensi di PC
  terpisah yang menarik pekerjaan lewat polling

### MySQL
- Lokal MySQL 8.0.30 → batas panjang index 3072 byte, aman
- **Versi di Hostinger belum diverifikasi.** Kalau ternyata MariaDB lama,
  batas index utf8mb4 adalah 191 karakter. **Cek dulu sebelum menulis
  migration Beregam**, bukan sesudah

### Zona waktu
- Simpan **UTC** di database, konversi hanya di batas tampilan
- `APP_TZ=Asia/Jakarta`, satu helper `nowWib()` dipakai seluruh modul
- Jangan mengandalkan zona waktu server — kemungkinan besar UTC

---

## Arsitektur Beregam

- Engine WhatsApp (**OpenWA**, `ENGINE_TYPE=baileys`, `127.0.0.1:2785`) ada di
  PC kantor dan **TIDAK bisa dijangkau dari Hostinger**
- **PESTA tidak pernah mengirim pesan WhatsApp.** PESTA menulis baris ke
  `beregam_outbox`; worker di PC yang mengambil dan mengirim
- Berlaku sama untuk AI: PESTA menulis `beregam_ai_jobs`, AI worker memproses
- Semua tabel berprefiks `beregam_`
- Route API di `src/app/api/beregam/`, semua dengan
  `export const dynamic = 'force-dynamic'` dan `runtime = 'nodejs'`
- Logika di `src/lib/beregam/`
- `src/lib/beregam/contracts.ts` adalah **satu-satunya sumber kebenaran**
  kontrak API. Repo `beregam` menyalinnya lewat `contracts:sync`, dan
  kecocokannya dijaga header runtime `X-Contracts-Version`

---

## Aturan Mutlak

1. **Model AI TIDAK BOLEH menghasilkan angka statistik.** Semua angka berasal
   dari tabel `beregam_indikator` lewat SQL, disisipkan ke template oleh kode.
   Ini instansi statistik — angka karangan bukan bug teknis, melainkan
   kerusakan institusional.
2. **Testimoni wajib bisa ditelusuri sumbernya.** Sistem menolak menayangkan
   testimoni yang kolom catatan sumbernya kosong. Pujian yang mengatasnamakan
   orang dan lembaga tertentu di situs resmi instansi harus bisa dibuktikan.

   *Statistik pengunjung dikecualikan.* Riwayat sebelum modul analitik
   dipasang diisi lewat backfill dan diperlakukan sebagai angka nyata di
   seluruh antarmuka, atas keputusan pemilik sistem. Kolom `is_seeded` tetap
   ada di database untuk keperluan teknis (mencegah rollup menimpa riwayat
   dengan nol) dan tidak ditampilkan di mana pun.
3. **Jangan pernah menulis nomor telepon lengkap ke berkas log.** Samarkan
   menjadi bentuk seperti `62851****015`.
4. **Perbandingan secret SELALU `crypto.timingSafeEqual`**, jangan `===`.
5. **HMAC dihitung atas raw body.** Panggil `await req.text()` dulu, baru
   `JSON.parse`. Memakai `req.json()` lebih dulu akan mengubah byte-nya.
6. **Jangan pernah menaruh nilai rahasia di kode atau berkas yang ter-commit** —
   termasuk nilai cadangan. Nilai cadangan di dalam kode berarti siapa pun yang
   bisa membaca repositori dapat memalsukan token administrator. Gagal dengan
   pesan jelas lebih baik daripada jalan dengan kunci yang diketahui publik.
7. **Mode manual = bot diam total.** Kalau `session.mode === 'manual'`, catat
   pesan masuk lalu **berhenti**. Tanpa ini warga menerima dua jawaban sekaligus,
   dari petugas dan dari bot.

---

## Konvensi Proyek

### Struktur

```
src/
├── app/
│   ├── (halaman publik)     page.tsx, sinta/, dashboard/
│   ├── admin/               halaman admin, semuanya "use client"
│   └── api/                 Route Handler
├── components/
│   ├── layout/              Navbar, Footer
│   ├── modals/              VidconModal, PengaduanModal
│   ├── sections/            section landing page
│   └── ui/                  komponen kecil bersama
└── lib/                     auth.ts, db/, schemas/, utils.ts
```

### Pola yang dipakai

- **Route Handler**, bukan Server Action, untuk API yang sudah ada.
  Server Action dipakai untuk inbox Beregam nanti
- Halaman admin adalah **client component** yang mengambil data lewat `fetch`
  ke `/api/admin/*`
- Setiap route `/api/admin/*` **wajib** memanggil `getAdminSession()` di baris
  pertama dan membalas 401 bila null
- Bentuk respons API seragam: `{ success: boolean, message?: string, ... }`
- Pesan untuk pengguna **berbahasa Indonesia**
- Komentar kode berbahasa Indonesia — dibaca rekan kerja di BPS juga

### Keamanan & peran

- **`src/proxy.ts` menjaga semua `/admin/*` di sisi server.** Konvensi Next 16
  (pengganti `middleware`). Selalu jalan di runtime Node, jadi `jsonwebtoken`
  bisa dipakai langsung dan **tidak boleh** mengekspor `runtime`.
- Route `/api/admin/*` **tetap** memanggil `getAdminSession()` sendiri.
  Jangan mengandalkan proxy saja - kalau berkas itu diubah atau dilewati,
  endpoint harus tetap terlindungi.
- Kewenangan khusus SUPERADMIN dijaga `requireRole(ROLE.SUPERADMIN)` di
  `src/lib/auth.ts`. Bedakan penolakannya: **401** untuk belum login,
  **403** untuk sudah login tapi tidak berwenang.
- **Hash password tidak pernah keluar dari server.** Jangan pernah memilih
  kolom `password` pada query yang hasilnya dikirim ke klien.
- Pesan gagal login sengaja sama untuk "email tidak terdaftar" dan "password
  salah". Membedakannya memberi tahu penyerang email mana yang ada.

### Analitik pengunjung

- **Alamat IP tidak pernah disimpan**, tidak di kolom mana pun, tidak di log.
  Yang disimpan hanya `sha256(ip + userAgent + garam harian)`; garamnya
  berganti tiap hari agar sidik tidak bisa dilacak antar hari.
- Perekaman lewat beacon dari browser (`/api/track`), bukan dari proxy -
  tidak menambah latensi halaman, dan perayap tersaring sendiri.
- Rollup harian dipicu dari `/api/track` dengan gerbang waktu, **tanpa cron**.
  Pola yang sama nanti dipakai heartbeat Beregam.
- Data simulasi wajib bertanda `isSeeded` dan **wajib dilabeli di UI**.
  Rollup tidak pernah menimpa baris simulasi; skrip seed tidak pernah
  menimpa baris data nyata.

### Utang yang diketahui

- Halaman admin memakai pola client-fetch dan semuanya ditandai aturan
  `react-hooks/set-state-in-effect`. Pola ini sudah ada sejak awal dan
  sesuai konvensi di atas. Membenahinya menyeluruh (mengubah halaman admin
  jadi Server Component) layak jadi langkah tersendiri, bukan diselipkan.

### Validasi

- **Satu skema Zod per domain di `src/lib/schemas/`**, diimpor bersama oleh
  form dan route API. **Dilarang mendefinisikan ulang skema di masing-masing
  berkas** — itu penyebab bug `layananInklusif`, yang membuat isian warga
  hilang diam-diam di antara form dan database tanpa error apa pun
- **Jangan pakai `as any` pada `register()`.** Cast itulah yang membungkam
  TypeScript dan menyembunyikan field yang tidak terdaftar di skema

### Berkas PowerShell (`.ps1`)

**Wajib ASCII murni.** Windows PowerShell 5.1 membaca berkas tanpa BOM memakai
codepage ANSI, bukan UTF-8. Akibatnya em-dash (`—`, byte `E2 80 94`) terbaca
sebagai tiga karakter, dan byte `0x94` menjadi tanda kutip pintar yang
**diterima PowerShell sebagai pembatas string** - seluruh skrip gagal di-parse
dengan pesan menyesatkan di baris yang sama sekali tidak bermasalah.

Pakai tanda hubung biasa (`-`), bukan `—` atau `–`. Berlaku juga untuk
tanda kutip pintar dan simbol lain di luar ASCII.

### Dependency

- **Hindari menambah dependency baru.** Grafik pakai SVG buatan sendiri,
  peta pakai embed tanpa library, CSV dibangkitkan sebagai string
- Sebelum menambah, tanyakan dulu apakah bisa tanpa itu

---

## Perintah

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run db:backup
```

Siapkan SQL migration untuk phpMyAdmin Hostinger:

```bash
npm run db:sql -- sejak 0001
```

Periksa hasil deploy:

```bash
npm run cek:deploy -- https://bpskabmusirawas.com
```

Panduan deploy lengkap ada di `docs/DEPLOY.md`.

Cek database lokal:

```bash
"C:/laragon/bin/mysql/mysql-8.0.30-winx64/bin/mysql.exe" -u root -e "SHOW TABLES FROM pesta;"
```

`npm run build` wajib hijau sebelum commit.

---

## Environment

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | `mysql://root@127.0.0.1:3306/pesta` (lokal) |
| `DB_USER` / `DB_PASS` / `DB_HOST` / `DB_PORT` / `DB_NAME` | Alternatif Hostinger bila hPanel hanya menyediakan variabel terpisah |
| `JWT_SECRET` | Wajib, minimal 32 karakter. Bangkitkan dengan `openssl rand -hex 32` |
| `APP_TZ` | `Asia/Jakarta` |
| `GOOGLE_MAPS_EMBED_KEY` | Opsional. Kosong berarti peta otomatis memakai OpenStreetMap |

> ⚠️ **`.env.production` menimpa `.env` saat `NODE_ENV=production`** (yaitu saat
> `npm run build` dan `npm start`). Berkas itu sudah diganti nama menjadi
> `.env.production.example` supaya tidak diam-diam menimpa konfigurasi lokal.
> Jangan membuatnya kembali di komputer pengembangan.

---

## Backup

**Git menyimpan kode, bukan isi database.** Riwayat pesan kontak, permohonan
ViDCon, aduan, dan nanti seluruh percakapan WhatsApp **tidak ikut ter-push**.

| Yang dilindungi | Caranya | Frekuensi |
|---|---|---|
| Kode & dokumen | `git push` ke GitHub | Tiap tahap selesai |
| Isi database | `npm run db:backup` lalu salin ke luar komputer | Mingguan |
| Kredensial | Brankas kredensial, **jangan di repo** | Saat berubah |

*Backup yang belum pernah diuji restore bukan backup.*

---

## Kesalahan yang Harus Dihindari

1. Memakai `req.json()` sebelum menghitung HMAC
2. Membandingkan secret dengan `===`
3. Webhook memproses berat sebelum membalas 200 — gateway akan timeout lalu
   mengulang kirim, dan warga menerima balasan dobel
4. Bind engine WhatsApp ke `0.0.0.0` — seluruh jaringan kantor bisa mengirim
   WA atas nama BPS
5. Lupa memeriksa `mode === 'manual'` di `BeregamService`
6. Lupa memvalidasi `assignedTo` di `replyToContact` — dua petugas bisa
   membalas warga yang sama
7. Membiarkan model menghasilkan angka statistik
8. Mendefinisikan ulang skema Zod di berkas yang berbeda
9. Menyimpan nomor telepon lengkap di berkas log
10. Membangun inbox di atas SSE sejak awal — mulai dengan polling
