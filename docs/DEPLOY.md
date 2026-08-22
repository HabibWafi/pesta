# Deploy PESTA ke Hostinger Business

Panduan ini untuk memperbarui situs yang **sudah berjalan** di
`bpskabmusirawas.com`. Database produksi sudah berisi tabel dan data lama;
yang dilakukan di sini adalah menambahkan tabel dan kolom baru, lalu
menerbitkan kode terbaru.

> Kerjakan berurutan. Langkah 1 menentukan apakah langkah 3 perlu disesuaikan.

---

## 0. Sebelum menyentuh apa pun: backup

**Ini langkah yang paling sering dilewati dan paling mahal kalau salah.**

1. hPanel → **Databases** → **phpMyAdmin** → pilih database PESTA
2. Tab **Export** → format **SQL** → **Go**
3. Simpan berkasnya di luar komputer kerja (Drive / HDD eksternal)

Backup lokal juga bisa dibuat dengan:

```bash
npm run db:backup
```

> Prosedur restore sudah diuji di komputer pengembangan: seluruh tabel,
> teks bermultibaris, hash bcrypt, dan kolom JSON kembali utuh. Uji yang
> sama layak dilakukan sekali terhadap backup produksi, ke database
> staging, sebelum benar-benar bergantung padanya.

---

## 1. Periksa versi database

Di phpMyAdmin, tab **SQL**, jalankan:

```sql
SELECT VERSION() AS versi, @@character_set_database AS charset;
```

Catat hasilnya. Dua hal yang dipengaruhi:

| Hasil | Artinya |
|---|---|
| MySQL 8.x | Semua SQL di langkah 3 bisa dipakai apa adanya |
| MariaDB 10.2+ | Umumnya jalan, tapi lihat catatan di bawah |
| MariaDB < 10.2 | Tipe `JSON` tidak ada. Hubungi pengembang sebelum lanjut |

**Catatan MariaDB.** SQL yang dibangkitkan memakai bentuk
`DEFAULT (CURRENT_TIMESTAMP(3))` dengan tanda kurung - itu sintaks MySQL 8.
Bila MariaDB menolaknya, hapus tanda kurungnya menjadi
`DEFAULT CURRENT_TIMESTAMP(3)`.

**Soal batas panjang index** yang dikhawatirkan di rancangan: tabel `users`
yang sudah berjalan punya `UNIQUE` pada kolom `varchar(255)` utf8mb4, yaitu
1020 byte. Bila server ini memakai MariaDB lama dengan batas 767 byte,
tabel itu tidak akan pernah bisa dibuat. Jadi batas tersebut kemungkinan
besar tidak berlaku di sini - tapi tetap konfirmasi lewat query di atas.

---

## 2. Siapkan variabel environment

hPanel → **Website** → **Node.js** → aplikasi PESTA → **Environment Variables**.

| Variabel | Nilai | Catatan |
|---|---|---|
| `DATABASE_URL` | `mysql://USER:SANDI@localhost:3306/NAMA_DB` | Atau isi `DB_USER`/`DB_PASS`/`DB_HOST`/`DB_PORT`/`DB_NAME` terpisah |
| `JWT_SECRET` | hasil `openssl rand -hex 32` | **Minimal 32 karakter.** Aplikasi menolak start bila kurang |
| `NODE_ENV` | `production` | |
| `APP_TZ` | `Asia/Jakarta` | |
| `GOOGLE_MAPS_EMBED_KEY` | *(boleh kosong)* | Kosong pun peta Google tetap tampil |

**Variabel Beregam belum perlu diisi sekarang.** Selama `BEREGAM_API_KEY` dan
`BEREGAM_WEBHOOK_HMAC` kosong, seluruh route `/api/beregam/*` membalas **503
"Modul Beregam belum dikonfigurasi di server ini."** Itu perilaku yang
disengaja: kode bot boleh ter-deploy lebih dulu tanpa menyalakan apa pun, dan
halaman publik sama sekali tidak terpengaruh. Isi variabelnya nanti, saat
worker di PC kantor sudah siap disambungkan.

Satu variabel tambahan, opsional: `BEREGAM_STAFF_WA` - nomor WA petugas
(angka saja, mis. `6285707473757`) yang menerima notifikasi tiap kali ada
warga minta bicara dengan petugas. Kosong berarti notifikasi ini dilewati
saja; sisa modul tetap berjalan normal.

> **Jangan membuat berkas `.env.production` di server.** Next.js memuatnya
> dengan prioritas lebih tinggi daripada `.env`, dan pernah menyebabkan
> koneksi database tertimpa nilai placeholder di komputer pengembangan.
> Pakai Environment Variables hPanel saja.

**Bila `JWT_SECRET` diganti**, semua sesi admin yang sedang berjalan menjadi
tidak valid dan setiap orang harus login ulang. Itu wajar dan aman.

---

## 3. Jalankan migration database

Di komputer pengembangan:

```bash
npm run db:sql -- sejak 0001 > untuk-hostinger.sql
```

Buka berkas hasilnya, salin isinya, lalu jalankan di **phpMyAdmin → SQL**.
Jalankan berurutan dari atas ke bawah.

Migration yang dijalankan:

| Berkas | Isi |
|---|---|
| `0001_layanan_inklusif` | Kolom pendampingan inklusif pada `vidcon_requests` |
| `0002_konten_landing` | Tabel `site_settings`, `testimonials`, `faqs` |
| `0003_analitik_pengunjung` | Tabel `analytics_events`, `analytics_daily` |
| `0004_analitik_per_halaman` | Tabel `analytics_path_daily` |
| `0005_beregam_fondasi` | 14 tabel berprefiks `beregam_` untuk bot WhatsApp |

> Migration **tidak pernah** dijalankan lewat CLI di server, dan **jangan**
> membuat endpoint migration sekali-pakai di aplikasi. Endpoint semacam itu
> adalah lubang keamanan yang jauh lebih mahal daripada ketidaknyamanan
> menyalin SQL.

Verifikasi setelah selesai:

```sql
SHOW TABLES;
```

Harus ada **24 tabel**: 10 tabel inti - `users`, `vidcon_requests`,
`pengaduans`, `contacts`, `site_settings`, `testimonials`, `faqs`,
`analytics_events`, `analytics_daily`, `analytics_path_daily` - ditambah
14 tabel berprefiks `beregam_`.

> **Nilai bawaan waktu sengaja ditulis tanpa tanda kurung.** drizzle-kit
> menghasilkan `DEFAULT (CURRENT_TIMESTAMP(3))`, bentuk "nilai bawaan berupa
> ekspresi" yang baru ada sejak MySQL 8.0.13. `npm run db:sql` mengubahnya
> menjadi bentuk tanpa kurung yang diterima MySQL 5.6 ke atas maupun seluruh
> MariaDB, dengan arti yang sama persis. Jangan menyalin berkas di
> `db/migrations/` mentah-mentah ke phpMyAdmin - lewati selalu `npm run db:sql`.

---

## 4. Terbitkan kode

Repositori sudah ada di [github.com/HabibWafi/pesta](https://github.com/HabibWafi/pesta),
jadi pakai integrasi GitHub hPanel - lebih baik daripada unggah ZIP manual
karena riwayatnya jelas dan bisa dikembalikan.

hPanel → **Website** → **Git** → hubungkan repositori, cabang `main`.

Setelah menarik kode:

```bash
npm ci --omit=dev
npm run build
```

Lalu **Restart Application** di hPanel.

> `npm ci` memakai `package-lock.json` apa adanya, sehingga versi paket di
> server sama persis dengan yang diuji di komputer pengembangan.

### Perkiraan pemakaian disk

Diukur di komputer pengembangan:

| Bagian | Ukuran | Ikut ke server? |
|---|---|---|
| `node_modules` | ~626 MB | Ya (lebih kecil dengan `npm ci --omit=dev`) |
| `.next/server` + `.next/static` | ~41 MB | Ya - inilah yang dipakai saat aplikasi berjalan |
| `.next/cache` | ~216 MB | Terbentuk saat build, **boleh dihapus** setelahnya |
| `.next/dev` | ~676 MB | **Tidak.** Hanya ada di komputer pengembangan |

Bila kuota disk mepet, `rm -rf .next/cache` setelah build aman dilakukan -
konsekuensinya hanya build berikutnya jadi lebih lama.

---

## 5. Isi konten awal

Konten halaman utama sekarang dibaca dari database. Setelah migration,
tabelnya masih kosong - situs tetap tampil karena ada nilai bawaan di kode,
tapi belum bisa diubah dari admin.

Jalankan sekali dari komputer pengembangan, dengan `DATABASE_URL` diarahkan
ke database produksi (aktifkan Remote MySQL di hPanel lebih dulu):

```bash
npm run db:seed:konten
```

Atau isi manual lewat `/admin/konten` setelah login.

**Riwayat kunjungan** (opsional, agar grafik tidak kosong):

```bash
npm run db:seed:analitik
```

---

## 6. Uji setelah deploy

Ganti `DOMAIN` dengan domain sebenarnya.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://DOMAIN/
```

Checklist:

- [ ] Halaman utama **200**, alamat & jam layanan tampil
- [ ] `/admin/dashboard` tanpa login → **307** ke `/admin/login`
- [ ] Isi dashboard **tidak** terlihat di HTML sumber saat belum login
- [ ] `/api/admin/stats` tanpa login → **401**
- [ ] Login admin berhasil, dashboard menampilkan angka yang benar
- [ ] `/admin/konten` bisa mengubah telepon, dan berubah di halaman utama
- [ ] Peta lokasi tampil
- [ ] Kirim pesan kontak dari halaman utama → muncul di `/admin/contact`
- [ ] Buka beberapa halaman → `/admin/analytics` bertambah
- [ ] Ekspor CSV terunduh dan terbuka rapi di Excel

Skrip pemeriksaan otomatis:

```bash
npm run cek:deploy -- https://DOMAIN
```

---

## 7. Ukur batas Entry Process

hPanel → **Website** → **Advanced** → cari **Max Process** / **Entry Process**.

Catat angkanya. Ini penting **sebelum** worker Beregam mulai memanggil
server tiap 3 detik, dan sebelum banyak petugas membuka inbox bersamaan.
Aplikasi Node menahan prosesnya selama hidup, berbeda dari PHP.

Pool database sudah dibatasi 5 koneksi (`src/lib/db/index.ts`). Bila batas
Entry Process ternyata kecil, angka itu yang pertama kali diturunkan.

---

## 8. Siapkan staging

Paket Business menyediakan **5 aplikasi Node.js**. Satu dipakai produksi,
jadi masih ada empat.

1. Buat subdomain, mis. `staging.bpskabmusirawas.com`
2. Buat database **terpisah** untuk staging
3. Aplikasi Node.js kedua, cabang git yang sama
4. Isi Environment Variables sendiri, dengan `JWT_SECRET` berbeda

Staging dibutuhkan untuk menguji webhook Beregam nanti: webhook memerlukan
URL publik, sehingga tidak bisa diuji dari komputer pengembangan. Tanpa
staging, percobaan pertama akan langsung mengenai warga sungguhan.

---

## Kalau terjadi masalah

| Gejala | Periksa |
|---|---|
| Aplikasi gagal start | Log Node.js di hPanel. Pesan `JWT_SECRET belum diatur` berarti variabelnya kosong atau kurang dari 32 karakter |
| Halaman utama 500 | `DATABASE_URL` salah, atau migration langkah 3 belum dijalankan |
| Halaman tampil tapi alamat kosong | Tabel `site_settings` belum diisi - lihat langkah 5 |
| Login selalu gagal | `JWT_SECRET` berubah? Semua sesi lama batal, coba login ulang |
| "Terlalu banyak percobaan login" | Pembatas 5 kali gagal / 15 menit. Tunggu, atau restart aplikasi |
| Peta kotak kosong | Biasanya jaringan. Coba ganti jenis peta ke OpenStreetMap di `/admin/konten` |

**Mengembalikan versi sebelumnya:** di hPanel Git, tarik commit lama, lalu
`npm ci --omit=dev && npm run build` dan restart. Migration database tidak
ikut mundur - itu sebabnya langkah 0 penting.
