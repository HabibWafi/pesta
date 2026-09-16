# Dashboard Data Strategis Musi Rawas

Dashboard memakai Web API resmi BPS dan MySQL. Browser warga tidak pernah
memanggil BPS secara langsung dan aplikasi tidak membaca HTML situs publik.
Versi yang belum diverifikasi tidak dapat dibaca dashboard maupun SINTA.

## Aktivasi awal

1. Daftarkan kunci di <https://webapi.bps.go.id/developer/> dan isi
   `BPS_WEBAPI_KEY` di `.env` lokal serta Environment Variables hPanel.
2. Periksa versi database Hostinger, buat backup, lalu jalankan migration
   `0010_dashboard_data` melalui `npm run db:sql -- 0010` dan phpMyAdmin.
3. Masuk ke **Admin > Kelola Dashboard Data**. Paket 23 indikator sudah ada,
   tetapi sinkronisasi semuanya sengaja mati sampai ID sumber diperiksa.
4. SUPERADMIN mengisi `sourceRef` dan `sourceConfig`, kemudian menyalakan
   sinkronisasi per dataset. `th` adalah ID periode BPS, bukan angka tahun.
5. Tekan **Periksa Pembaruan BPS**, buka **Rincian**, periksa nilai, periode,
   wilayah, dimensi, satuan, sumber, serta baris yang hilang. Terbitkan hanya
   setelah pemeriksaan substansi.
6. Dashboard tetap dalam mode pratayang petugas sampai saklar
   `tampilan.dashboard` dinyalakan di **Kelola Konten > Tampilan**.

Contoh konfigurasi data dinamis:

```json
{
  "th": "ID_PERIODE_BPS",
  "wilayahLevel": "kabupaten"
}
```

Contoh konfigurasi SIMDASI:

```json
{
  "wilayah": "1605000",
  "tahun": 2026,
  "wilayahLevel": "kecamatan"
}
```

ID tabel disimpan di `sourceRef`, bukan di dalam konfigurasi. Indikator yang
belum ditemukan di API dibiarkan belum tersedia; jangan mengisi perkiraan.

### Input manual

1. Ubah jenis sumber dataset menjadi **Manual** dan simpan URL sumber resmi.
2. Pada katalog indikator, pilih **Impor** lalu isi dokumen JSON mengikuti
   contoh pada panel. Gunakan titik sebagai pemisah desimal.
3. Impor selalu membuat versi draf. Buka **Rincian**, bandingkan setiap baris,
   lalu isi catatan peninjauan sebelum menerbitkan atau menolak.

Sinkronisasi, impor manual, publikasi, penolakan, dan penarikan versi hanya
dapat dilakukan SUPERADMIN. Penarikan tidak menghapus data: versi menjadi
arsip, hilang dari API publik, dan tetap dapat diaudit.

## API publik

- `GET /api/data/datasets?q=&tema=&featured=1`
- `GET /api/data/datasets/[slug]?period=&areaLevel=&areaCode=&dim.nama=nilai&page=1&limit=1000`
- `GET /api/data/datasets/[slug]/csv` dengan filter yang sama

Nilai desimal dikirim sebagai string. JSON dan CSV menggunakan fungsi filter
yang sama. Cache dibatalkan sesudah versi diterbitkan atau pengaturan tampilan
diubah. CSV memuat metadata sumber dan menetralkan awalan formula spreadsheet.
API publik dibatasi 120 permintaan per menit berdasarkan sidik harian yang
tidak menyimpan alamat IP mentah. Detail JSON dipaginasi maksimal 1.000
observasi per respons; CSV dibatasi 50.000 observasi per unduhan.

Tautan tampilan menyimpan dataset, visualisasi, periode, wilayah, dan dimensi
aktif. Pengguna dapat menyalinnya dari tombol **Salin tautan**.

## Peta

Ikuti `public/data/wilayah/README.md`. Peta baru muncul setelah GeoJSON resmi
beserta metadata asal, CRS, dan izin publikasinya diproses dengan
`npm run siapkan:geojson`. Kode wilayah harus sama persis dengan observasi.

## Fondasi SINTA

Worker memakai `IndicatorQuery` di `src/lib/beregam/contracts.ts` melalui
`POST /api/beregam/indicators/query`. Endpoint menerima operasi terbatas:
`lookup`, `compare`, `trend`, dan `rank`; tidak menerima SQL. Resolver hanya
membaca versi terbit dengan `verifiedBy` terisi. Model menerima label tanpa
digit dan token `[[FAKTA_n]]`; PESTA menolak digit atau token asing dari
narasi lalu menyisipkan nilai dan sumber asli melalui kode.

Setelah kontrak berubah, jalankan `npm run contracts:sync` di repositori
worker Beregam sebelum menyalakan integrasi SINTA.
