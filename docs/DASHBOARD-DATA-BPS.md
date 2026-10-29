# Data awal dashboard BPS Musi Rawas

Penelusuran: 29 Oktober 2026. Angka ditranskripsi dari tabel resmi BPS, bukan
dibangkitkan model atau diambil dari data contoh. Manifest sumber ada di
`db/data/dashboard-bps-2026.json`. Antarmuka hanya membaca versi terpublikasi
dari tabel `beregam_indikator`, melalui layanan dataset yang sudah ada.

| Dataset | Periode | Satuan | Observasi |
| --- | --- | --- | --- |
| Jumlah penduduk | 2026 | Ribu jiwa | 1 |
| Penduduk menurut jenis kelamin | 2026 | Ribu jiwa | 2 |
| Penduduk menurut kelompok umur dan jenis kelamin | 2026 | Ribu jiwa | 48 |
| Jumlah penduduk miskin | 2024 | Ribu jiwa | 1 |
| Persentase penduduk miskin | 2024 | Persen | 1 |

Sumber kependudukan:
[tabel umur dan jenis kelamin BPS](https://musirawaskab.bps.go.id/id/statistics-table/3/WVc0MGEyMXBkVFUxY25KeE9HdDZkbTQzWkVkb1p6MDkjMw%3D%3D/population-by-age-groups-and-sex--thousand--in-musi-rawas-regency--2023.html).
Halaman yang terindeks menampilkan tahun **2026**, diperbarui **20 Februari 2026**,
meskipun slug URL masih berakhiran 2023. Acuan periode adalah judul dan tahun
terpilih pada isi tabel. Sumber tabel adalah Proyeksi Penduduk Kabupaten/Kota
Provinsi Sumatera Selatan 2020–2035 (Hasil Sensus Penduduk 2020).

Sumber kemiskinan:
[jumlah penduduk miskin](https://musirawaskab.bps.go.id/id/statistics-table/2/MTEyIzI%3D/jumlah-penduduk-miskin.html)
dan [persentase penduduk miskin](https://musirawaskab.bps.go.id/id/statistics-table/2/MTEzIzI%3D/persentase-penduduk-miskin.html).
Keduanya menampilkan periode 2024 dan pembaruan 15 Mei 2025 pada hasil penelusuran.
Ini merupakan pilihan data awal yang berhasil diperiksa, bukan klaim bahwa
tidak tersedia rilis yang lebih baru.

## Catatan pembacaan

- Pertahankan ribu jiwa dan pembulatan satu desimal pada data penduduk.
  Jumlah rincian bisa berbeda dari total resmi karena pembulatan; jangan
  menghitung ulang total untuk mengganti angka sumber.
- Kategori `Total` pada dataset umur adalah total resmi setiap kelompok umur.
  Jangan menjumlahkannya bersama kategori laki-laki dan perempuan.
- Data yang berbeda periode tidak dijadikan satu seri tren.
- Tidak ada angka kepadatan, pertumbuhan, atau rasio jenis kelamin yang
  diperkirakan untuk melengkapi katalog. Indikator tanpa versi terpublikasi
  tetap tidak tampil.

## Impor lokal

Pastikan migration dashboard yang sudah ada telah diterapkan, backup database,
dan gunakan ID SUPERADMIN yang benar di lingkungan tujuan.

```bash
# Menyimpan draf agar bisa ditinjau melalui /admin/data
npm run db:seed:dashboard -- --reviewer 1

# Setelah memeriksa sumber, publikasi paket awal dan aktifkan menu
npm run db:seed:dashboard -- --reviewer 1 --publish --enable
```

Script memvalidasi observasi dengan skema Zod bersama, mencatat sumber dan audit,
serta melewati versi identik yang sudah terpublikasi. Versi aktif lain tidak
ditimpa. Tidak ada perubahan struktur database, panggilan WhatsApp, atau
sinkronisasi otomatis. Mulai ulang aplikasi setelah impor agar cache katalog
dan pengaturan dibaca ulang.

Kode dan manifest yang masuk Git **tidak** otomatis mengisi database Hostinger.
Berkas `db/data/dashboard-bps-2026.sql` berisi paket data untuk phpMyAdmin.
Untuk membangkitkannya kembali:

```bash
npm run db:seed:dashboard -- --reviewer 1 --publish --enable --sql db/data/dashboard-bps-2026.sql
```

Opsi `--sql` hanya menulis berkas, tanpa menghubungi atau mengubah database.
SQL tidak membuat atau mengubah struktur tabel. Backup produksi, periksa
`SELECT VERSION()`, penerapan migration dashboard yang sudah ada, dan ID
SUPERADMIN tujuan sebelum menjalankannya. Dataset dengan versi yang sudah ada
dilewati. Data, metadata, verifikasi, audit, dan pengaktifan menu berada dalam
satu transaksi. Mulai ulang aplikasi setelah impor agar cache diperbarui.

Periksa kembali sumber dan periode sebelum publikasi. Jangan membuat endpoint
migration atau menjalankan seed lokal dengan kredensial produksi secara tidak
sengaja.
