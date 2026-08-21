# 🚀 Petunjuk Panduan Deploy Website PESTA BPS Musi Rawas di Hostinger

Berkas ZIP ini telah **dioptimalkan secara khusus untuk deployment di Hostinger**. Seluruh berkas yang tidak diperlukan (*node_modules*, *.next*, cache, & file temporary) telah **dibersihkan** agar ukuran berkas sangat ringan dan siap di-build langsung oleh Hostinger.

---

## 📋 Langkah-Langkah Deployment di Hostinger:

### Langkah 1: Buat Database MySQL & Impor Data di Hostinger
1. Masuk ke **hPanel Hostinger** ➔ Pilih menu **Databases** ➔ **MySQL Databases**.
2. Buat database baru (misal: `u123456_pesta_db`) beserta User & Password Database-nya.
3. Buka **phpMyAdmin** database tersebut di Hostinger.
4. Klik tab **Import** ➔ Pilih berkas SQL yang sudah disertakan di dalam folder ZIP ini:
   `prisma/pesta_db_deploy.sql`
5. Klik **Go / Impor**. Seluruh tabel (`users`, `vidcon_requests`, `pengaduans`, `contacts`) beserta 100% data riwayat akan terpasang sempurna di database Hostinger.

---

### Langkah 2: Unggah Berkas ZIP ke Hostinger File Manager
1. Buka **File Manager** domain/subdomain Anda di Hostinger.
2. Unggah berkas `pesta-frontend-deploy-hostinger.zip` ke dalam folder root situs Anda (biasanya `public_html` atau direktori aplikasi Node.js).
3. Ekstrak (*Unzip*) seluruh isi berkas tersebut.

---

### Langkah 3: Konfigurasi File `.env` di Hostinger
1. Di File Manager Hostinger, buat atau salin berkas `.env.example` menjadi `.env`.
2. Sesuaikan nilai `DATABASE_URL` dengan rincian MySQL Hostinger yang Anda buat di Langkah 1:
   ```env
   DATABASE_URL="mysql://USER_DATABASE:PASSWORD_DATABASE@localhost:3306/NAMA_DATABASE"
   JWT_SECRET="<isi dengan hasil perintah di bawah>"
   NODE_ENV="production"
   ```
3. **Bangkitkan `JWT_SECRET` sendiri** — jangan memakai nilai contoh dari mana pun:
   ```bash
   openssl rand -hex 32
   ```
   Simpan hasilnya di brankas kredensial. Berkas `.env` tidak pernah ikut ter-commit.

---

### Langkah 4: Jalankan Node.js App & Build di Hostinger
1. Pada hPanel Hostinger, buka menu **Node.js Web Apps** (atau via **SSH Terminal** Hostinger):
   - **Node.js Version**: Pilih `Node.js 18.x` atau `Node.js 20.x` (LTS).
   - **Application Root**: `public_html` (atau folder tempat Anda mengekstrak ZIP).
   - **Application Startup File**: `node_modules/next/dist/bin/next` (atau script `npm start`).
2. Jalankan perintah instalasi & build pada Terminal SSH / Node Manager Hostinger:
   ```bash
   npm install
   npx prisma generate
   npm run build
   ```
3. Klik **Start App / Restart Application** di Hostinger.

---

### 🔑 Kredensial Login Administrator

Kredensial **tidak ditulis di berkas ini**. Akun administrator sudah ada di tabel
`users` pada database (kolom `password` berisi hash bcrypt).

- Password disimpan di brankas kredensial / pengelola sandi, bukan di repositori.
- Jangan pernah menuliskan password, `JWT_SECRET`, atau API key ke berkas yang
  ikut ter-commit. Semua nilai rahasia hanya di `.env`, yang sudah di-*gitignore*.
- Untuk mengatur ulang password, gunakan halaman **Kelola Akun Admin** di panel
  administrator.

---

🎉 *Website PESTA Digital Musi Rawas kini aktif 100% di server Hostinger dengan performa tinggi!*
