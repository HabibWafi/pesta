# Aset wilayah Dashboard Data

Peta tidak diaktifkan dengan bentuk wilayah contoh. Siapkan GeoJSON resmi,
catatan sumber, dan izin publikasinya, lalu jalankan:

```bash
npm run siapkan:geojson -- sumber.geojson kecamatan KODE NAMA
npm run siapkan:geojson -- sumber-desa.geojson desa KODE NAMA KODE_KECAMATAN
```

Di samping berkas sumber wajib ada `<nama-berkas>.metadata.json`:

```json
{
  "sourceTitle": "Nama instansi dan nama data",
  "sourceUrl": "https://alamat-sumber-resmi.example/",
  "license": "Izin atau dasar publikasi",
  "crs": "EPSG:4326"
}
```

Skrip menolak kode duplikat, geometri selain Polygon/MultiPolygon, koordinat
di luar rentang bujur/lintang, desa tanpa kode induk, metadata kosong, dan CRS
selain WGS84. Keluaran dinormalisasi menjadi `kode`, `nama`, `level`, dan
`kodeInduk`; properti sumber lain tidak ikut dipublikasikan.

SLS tidak dimasukkan. Jangan menyalin berkas dari sumber yang izin
publikasinya tidak jelas.
