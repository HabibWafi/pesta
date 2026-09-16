# PRD Dashboard Data PESTA

## Ringkasan

Dashboard Data PESTA menyediakan akses mandiri ke indikator resmi Kabupaten Musi Rawas melalui halaman web yang mudah dibaca, dapat disaring, dapat diunduh, dan menyertakan sumber. Fitur ini memperluas PESTA dari pintu masuk layanan menjadi sarana akses data yang dapat dipakai masyarakat, petugas layanan, pemerintah daerah, peneliti, pelaku usaha, dan kelompok yang membutuhkan tampilan lebih sederhana atau aksesibel.

Dokumen ini menetapkan rancangan produk, tata kelola data, antarmuka, API, pengamanan, dan kriteria rilis. Bagian berstatus **Sudah tersedia** menggambarkan implementasi pada repositori saat dokumen dibuat. Bagian berstatus **Direncanakan** belum boleh dipromosikan sebagai layanan produksi sebelum kriteria penerimaannya terpenuhi.

## Status produk

| Komponen | Status | Catatan |
| --- | --- | --- |
| Halaman publik `/dashboard` | Sudah tersedia, di balik feature flag | Menampilkan indikator dan visualisasi yang sudah dipublikasikan |
| API dataset publik | Sudah tersedia | Daftar dataset, detail dataset, dan unduhan CSV |
| Alur admin versi, review, publikasi, penolakan | Sudah tersedia | Data tidak langsung tayang setelah sinkronisasi |
| Integrasi sumber BPS dan input manual | Sudah tersedia | Sumber dicatat pada versi dataset |
| Kueri indikator untuk Beregam/Sinta | Sudah tersedia | Operasi lookup, compare, trend, dan rank |
| Audit aksesibilitas dengan pengguna sasaran | Direncanakan | Wajib sebelum rilis publik penuh |
| Pemantauan kualitas, latensi, dan kegagalan sinkronisasi | Sudah tersedia | Panel admin menampilkan kelengkapan metadata, durasi rata-rata, dan run gagal/parsial |
| Peta tematik dengan GeoJSON produksi | Dalam pengembangan | Perlu validasi geometri, ukuran berkas, dan fallback tabel |

## Masalah yang diselesaikan

Pengguna sering perlu mencari angka pada beberapa tabel atau publikasi, lalu menafsirkan periode, satuan, wilayah, dan sumbernya. Proses itu lebih sulit bagi pengguna yang memakai telepon genggam, memiliki keterbatasan penglihatan atau motorik, berusia lanjut, atau belum terbiasa dengan tabel statistik. Petugas layanan juga mengulang pencarian untuk pertanyaan yang serupa.

Dashboard mengurangi langkah tersebut dengan menyajikan indikator terpilih dalam satu pola antarmuka. Setiap angka tetap terikat pada metadata sumber, periode, satuan, wilayah, dan versi publikasi. Dashboard tidak menggantikan publikasi resmi atau layanan konsultasi statistik.

## Tujuan

1. Menyediakan indikator resmi terpilih dalam tampilan yang ringkas dan dapat ditelusuri sumbernya.
2. Memungkinkan pengguna menyaring periode, wilayah, kategori, dan indikator tanpa mengolah berkas terlebih dahulu.
3. Menyediakan unduhan CSV yang konsisten dengan tampilan dan metadata.
4. Menjadi sumber fakta numerik terverifikasi untuk Sinta dan bot WhatsApp Beregam.
5. Menjaga pemisahan yang jelas antara data draf, data yang sedang ditinjau, dan data terpublikasi.
6. Memenuhi kebutuhan aksesibilitas dasar serta menyediakan fallback tabel untuk semua visualisasi.

## Bukan tujuan

- Menghasilkan proyeksi atau estimasi otomatis.
- Mengizinkan model AI menyusun angka statistik.
- Menggantikan tabel dinamis, publikasi, atau layanan konsultasi BPS.
- Menjadi gudang seluruh data BPS pada rilis awal.
- Menyediakan data mikro atau data yang dapat mengidentifikasi responden.
- Menampilkan data yang belum lolos review hanya karena data tersebut berhasil disinkronkan.

## Pengguna dan kebutuhan

| Pengguna | Kebutuhan utama |
| --- | --- |
| Masyarakat | Menemukan angka, arti indikator, periode, dan sumber dengan cepat |
| Lansia dan pengguna dengan literasi digital terbatas | Navigasi sederhana, teks jelas, target sentuh memadai, dan istilah yang dijelaskan |
| Penyandang disabilitas | Navigasi papan ketik, dukungan pembaca layar, kontras, fokus terlihat, dan alternatif tabel |
| Pemerintah daerah | Membandingkan periode atau wilayah dan mengunduh data untuk bahan kerja |
| Peneliti, mahasiswa, dan media | Melacak sumber, satuan, definisi, serta mengunduh data terstruktur |
| Petugas PST | Mengarahkan pengguna ke indikator yang tepat dan memeriksa sumber yang sama |
| Admin data | Menyinkronkan, meninjau, mengoreksi metadata, memublikasikan, dan menarik versi |
| Sinta/Beregam | Mengambil fakta numerik yang sudah dipublikasikan melalui kontrak terstruktur |

## Ruang lingkup rilis

### Kelompok indikator awal

Implementasi saat ini menyiapkan 23 indikator awal dalam enam kelompok: kependudukan, kemiskinan, pembangunan manusia, ketenagakerjaan, produk domestik regional bruto, dan tanaman pangan khususnya padi. Daftar aktual wajib berasal dari konfigurasi dan basis data, bukan ditulis ulang pada antarmuka.

Setiap indikator minimal memiliki:

- kode dan slug yang stabil;
- judul singkat dan definisi;
- satuan;
- dimensi waktu dan wilayah;
- sumber dan tautan rujukan jika tersedia;
- waktu pembaruan;
- status versi;
- catatan metodologi atau keterbatasan bila relevan.

### Sumber data

Sumber yang didukung adalah API dinamis BPS, SIMDASI, dan input manual yang dapat dipertanggungjawabkan. Semua proses menghasilkan versi draf. Admin meninjau cakupan, nilai, metadata, serta sumber sebelum publikasi.

## Prinsip produk

1. **Sumber menyertai angka.** Angka tanpa sumber, periode, satuan, dan wilayah tidak boleh dipublikasikan.
2. **Publikasi memerlukan review.** Sinkronisasi tidak sama dengan persetujuan.
3. **Versi lama tetap dapat diaudit.** Koreksi membuat versi baru dan tidak mengubah riwayat secara diam-diam.
4. **Visualisasi memiliki padanan tabel.** Informasi tidak boleh hanya disampaikan melalui warna, bentuk, atau peta.
5. **AI hanya membaca fakta.** Sinta dan Beregam menerima objek fakta terverifikasi, bukan akses bebas untuk mengarang nilai.
6. **Kegagalan terlihat.** Data kedaluwarsa, sumber gagal, atau metadata tidak lengkap harus tampak bagi admin dan tidak disamarkan.

## Pengalaman pengguna publik

### Alur utama

1. Pengguna membuka `/dashboard`.
2. Sistem menampilkan kelompok indikator dan waktu pembaruan terakhir.
3. Pengguna memilih indikator, periode, wilayah, dan kategori yang tersedia.
4. Sistem menampilkan ringkasan, grafik atau peta yang sesuai, tabel data, definisi, satuan, dan sumber.
5. Pengguna dapat menyalin tautan tampilan atau mengunduh CSV.
6. Jika data tidak tersedia, sistem menyebutkan filter yang tidak menghasilkan data dan menawarkan pengaturan ulang.

### Jenis tampilan

- Angka ringkas untuk satu nilai pada satu periode.
- Grafik garis untuk perubahan antarperiode.
- Grafik batang untuk perbandingan kategori atau wilayah.
- Batang bertumpuk atau komposisi untuk bagian terhadap total jika metadata mendukung.
- Peta untuk perbandingan wilayah jika geometri dan kode wilayah telah lolos validasi.
- Tabel sebagai representasi lengkap dan fallback aksesibel.

### Ketentuan aksesibilitas

- Seluruh kontrol dapat digunakan dengan papan ketik.
- Urutan fokus mengikuti urutan visual dan indikator fokus terlihat.
- Grafik memiliki judul, ringkasan tekstual noninterpretatif, dan tabel data.
- Warna bukan satu-satunya pembeda seri.
- Teks, kontrol, dan status memenuhi kontras minimum WCAG 2.2 AA.
- Target sentuh utama sekurang-kurangnya 44 x 44 piksel bila tata letak memungkinkan.
- Perubahan hasil filter diumumkan melalui live region tanpa memindahkan fokus secara paksa.
- Pengguna dapat memperbesar teks hingga 200 persen tanpa kehilangan fungsi.
- Widget aksesibilitas PESTA tetap tersedia, tetapi halaman juga harus aksesibel tanpa mengandalkan widget.

## Pengalaman admin

### Alur sinkronisasi dan publikasi

1. Admin yang telah terautentikasi memilih sumber dan dataset.
2. Sistem mengambil data, memvalidasi struktur, dan membuat versi draf.
3. Sistem menampilkan ringkasan perubahan terhadap versi terpublikasi: penambahan, perubahan, penghapusan, dan kegagalan.
4. Reviewer memeriksa nilai, metadata, cakupan periode, serta sumber.
5. Reviewer memublikasikan atau menolak versi dengan catatan.
6. Publikasi mengganti versi aktif secara atomik dan membersihkan cache terkait.
7. Riwayat menyimpan pelaku, waktu UTC, tindakan, serta catatan.
8. SUPERADMIN dapat menarik versi aktif; versi menjadi arsip dan segera hilang dari API publik tanpa menghapus jejak audit.

### Hak akses

- Semua route `/api/admin/data/*` memanggil `getAdminSession()` pada awal handler.
- Tindakan yang mengubah status mengikuti peran yang ditetapkan aplikasi.
- Sinkronisasi, impor manual, publikasi, penolakan, dan penarikan versi hanya dapat dilakukan SUPERADMIN; ADMIN tetap dapat meninjau dan mengelola presentasi dataset.
- Respons membedakan 401 untuk belum login dan 403 untuk tidak berwenang.
- Kolom rahasia dan hash kata sandi tidak pernah dipilih untuk respons klien.

## Model data konseptual

| Entitas | Tanggung jawab |
| --- | --- |
| Dataset | Identitas, judul, deskripsi, dimensi, jenis visualisasi, dan status konfigurasi |
| Dataset version | Satu hasil sinkronisasi atau input manual beserta status review |
| Observation | Nilai dengan indikator, periode, wilayah, kategori, satuan, dan versi |
| Source | Nama sumber, URL, metode pengambilan, serta waktu akses |
| Review event | Aktor, tindakan, catatan, dan waktu untuk jejak audit |
| Indicator registry | Pemetaan kode stabil yang dipakai dashboard dan kontrak Beregam |

Semua waktu disimpan dalam UTC dan dikonversi pada batas tampilan dengan zona `Asia/Jakarta`.

## Kontrak API

### API publik yang tersedia

| Metode dan path | Fungsi |
| --- | --- |
| `GET /api/data/datasets` | Mengambil daftar dataset terpublikasi beserta metadata ringkas |
| `GET /api/data/datasets/[slug]` | Mengambil metadata, filter, dan observasi versi aktif |
| `GET /api/data/datasets/[slug]/csv` | Mengunduh data versi aktif sebagai CSV |

### API Beregam yang tersedia

`POST /api/beregam/indicators/query` menerima kontrak `IndicatorQuery` dari `src/lib/beregam/contracts.ts`. Operasi yang didukung adalah `lookup`, `compare`, `trend`, dan `rank`. Respons hanya memuat fakta dari versi yang telah dipublikasikan.

### Ketentuan respons

- Bentuk respons mengikuti `{ success: boolean, message?: string, ... }`.
- Kesalahan validasi mengembalikan pesan bahasa Indonesia yang dapat ditindaklanjuti.
- Endpoint publik hanya membaca versi aktif.
- CSV memakai UTF-8, header stabil, dan rumus spreadsheet berbahaya dinetralkan.
- Cache key mencakup slug, versi aktif, dan filter yang dinormalisasi.

## Integrasi dengan Sinta dan Beregam

Dashboard menjadi satu-satunya jalur angka statistik untuk Sinta. Urutannya:

1. Sinta atau worker Beregam mengirim `IndicatorQuery` terstruktur.
2. API mencari observasi pada versi terpublikasi.
3. API mengembalikan `VerifiedFact` beserta sumber dan metadata.
4. Kode aplikasi menyusun jawaban dari templat serta menyisipkan nilai.
5. Model bahasa, bila diaktifkan, hanya boleh menulis bagian nonnumerik dan tidak menerima angka mentah.

Jika kueri tidak menghasilkan fakta tunggal yang valid, sistem meminta klarifikasi atau mengarahkan pengguna ke petugas. Sistem tidak menebak periode, wilayah, indikator, atau nilai.

## Persyaratan nonfungsional

### Kinerja

- Halaman awal menampilkan struktur dan metadata penting tanpa menunggu seluruh seri yang tidak diperlukan.
- Respons dataset yang sering dipakai dicache secara terukur dan dibatalkan saat publikasi versi baru.
- Kueri publik dibatasi dan dipaginasi jika ukuran seri melewati ambang yang ditetapkan.
- Pool koneksi MySQL tetap kecil sesuai batas Hostinger.
- GeoJSON disederhanakan untuk web dan dimuat hanya saat peta dipilih.

### Keandalan

- Publikasi versi berlangsung dalam transaksi.
- Kegagalan sinkronisasi tidak mengubah versi aktif.
- Proses dapat diulang tanpa menggandakan observasi.
- Versi yang ditarik tidak lagi muncul di endpoint publik setelah invalidasi cache.

### Keamanan dan privasi

- Tidak ada data mikro atau pengenal responden.
- Input filter divalidasi dengan skema Zod bersama.
- Kueri basis data memakai parameter atau builder Drizzle.
- API publik menerapkan batas permintaan dan batas ukuran respons.
- Log tidak menyimpan token, rahasia, alamat IP mentah, atau data pribadi yang tidak diperlukan.
- Tindakan admin dicatat tanpa memuat kredensial.

## Metrik produk

Metrik diaktifkan setelah definisi, baseline, dan periode pengukuran disetujui. Tidak ada angka target dalam dokumen ini tanpa bukti operasional.

| Metrik | Definisi |
| --- | --- |
| Keberhasilan pencarian | Proporsi sesi yang menghasilkan tampilan dataset atau unduhan |
| Kueri tanpa hasil | Proporsi filter yang tidak menemukan observasi |
| Ketepatan waktu data | Selisih waktu sumber diperbarui dan versi dipublikasikan |
| Kualitas metadata | Proporsi dataset aktif yang memenuhi seluruh kolom wajib |
| Keberhasilan sinkronisasi | Proporsi pekerjaan sinkronisasi yang selesai tanpa kegagalan |
| Penggunaan aksesibel | Temuan uji tugas pengguna disabilitas dan lansia, bukan profil individu |
| Rujukan Sinta | Jumlah jawaban Sinta yang berhasil memakai fakta terverifikasi |

## Peluncuran

### Tahap 0 Verifikasi internal

- Validasi 23 indikator awal terhadap sumber.
- Periksa unit, periode, wilayah, definisi, dan URL sumber.
- Uji kegagalan sinkronisasi, penolakan, publikasi, dan penarikan versi.

### Tahap 1 Pratinjau admin

- Feature flag hanya aktif untuk admin.
- Petugas PST menjalankan skenario pencarian dan unduhan.
- Temuan dicatat sebagai isu dengan tingkat risiko.

### Tahap 2 Uji pengguna terbatas

- Libatkan pengguna papan ketik, pembaca layar, low vision, lansia, dan pengguna telepon genggam.
- Perbaiki hambatan kritis sebelum pembukaan publik.
- Pastikan tabel menjadi fallback yang setara untuk grafik dan peta.

### Tahap 3 Rilis publik

- Aktifkan feature flag bertahap.
- Pantau latensi, kesalahan, kueri tanpa hasil, dan kesehatan sinkronisasi.
- Sediakan tombol penonaktifan yang mengembalikan pengguna ke layanan PESTA lain tanpa kehilangan data.

### Rollback

Jika validitas data, kinerja, atau keamanan terganggu, admin menonaktifkan feature flag dan mempertahankan versi terakhir yang terverifikasi. Perbaikan dilakukan pada versi draf baru. Riwayat publikasi tidak dihapus.

## Kriteria penerimaan

1. Endpoint publik tidak pernah mengembalikan versi draf, ditolak, atau ditarik.
2. Setiap nilai yang tampil memiliki indikator, periode, wilayah, satuan, sumber, dan versi.
3. CSV memuat data yang sama dengan filter tampilan serta aman dibuka di spreadsheet.
4. Publikasi dan penarikan versi menginvalidasi cache terkait.
5. Kegagalan sinkronisasi tidak mengubah data publik.
6. Seluruh kontrol utama dapat digunakan dengan papan ketik dan pembaca layar.
7. Setiap visualisasi memiliki tabel data dan tidak mengandalkan warna saja.
8. Uji 200 persen zoom tidak menimbulkan kehilangan fungsi atau tumpang tindih.
9. Kueri Beregam hanya mengembalikan fakta dari versi terpublikasi.
10. Sinta menolak atau mengklarifikasi kueri yang ambigu dan tidak membuat angka.
11. Route admin mengembalikan 401 dan 403 sesuai kondisi otorisasi.
12. Build produksi, pengujian kontrak, dan skenario rollback lulus sebelum flag publik diaktifkan.

## Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Perubahan struktur sumber | Adapter per sumber, validasi skema, dan kegagalan tertutup |
| Data salah terpublikasi | Review wajib, perbandingan versi, audit trail, dan rollback |
| Pengguna salah menafsirkan angka | Definisi, satuan, periode, sumber, dan catatan metodologi ditampilkan bersama |
| Peta terlalu berat | GeoJSON disederhanakan, lazy load, cache, dan fallback tabel |
| Dashboard dianggap seluruh data BPS | Jelaskan cakupan indikator dan tautkan layanan konsultasi/publikasi |
| Klaim aksesibilitas tanpa pengujian | Gunakan WCAG sebagai standar dan uji dengan pengguna sasaran sebelum klaim publik |
| AI mengarang nilai | Pisahkan jalur fakta numerik, validasi token, dan injeksi nilai oleh kode |

## Keputusan terbuka

- Daftar final 23 indikator beserta pemilik review.
- Kebijakan frekuensi sinkronisasi untuk setiap sumber.
- Dataset yang layak memakai peta dan tingkat penyederhanaan GeoJSON.
- Baseline dan target metrik setelah data penggunaan tersedia.

## Keputusan implementasi

- Respons katalog dan detail memakai cache HTTP singkat 60 detik dengan stale-while-revalidate 300 detik; cache basis data dibatalkan saat publikasi atau penarikan versi.
- Detail JSON dipaginasi maksimal 1.000 observasi per respons. Unduhan CSV dibatasi 50.000 observasi dan meminta pengguna mempersempit filter jika terlampaui.
- API publik dibatasi 120 permintaan per menit per sidik harian. IP mentah tidak disimpan maupun ditulis ke log.
- Sinkronisasi, impor manual, publikasi, penolakan, dan penarikan versi hanya dapat dilakukan SUPERADMIN.
- Impor manual memakai JSON tervalidasi dan selalu menghasilkan draf; data tidak langsung tayang.
- Catatan peninjauan minimal tiga karakter wajib untuk publikasi, penolakan, dan penarikan.
