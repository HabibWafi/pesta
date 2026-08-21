# Migration

Berkas SQL di folder ini dibangkitkan dari `src/lib/db/schema.ts`.

## Alur kerja

Hostinger Business tidak memberi shell bebas, jadi migration **tidak** pernah
dijalankan lewat CLI di server. Alurnya:

1. Ubah `src/lib/db/schema.ts`
2. Jalankan `npm run db:generate` - menghasilkan berkas `.sql` baru di sini
3. Baca SQL-nya, pastikan masuk akal
4. Jalankan di **phpMyAdmin** hPanel

> Jangan membuat endpoint migration sekali-pakai di aplikasi. Endpoint semacam
> itu adalah lubang keamanan yang jauh lebih mahal daripada ketidaknyamanan
> menyalin SQL.

## Sebelum migration Beregam

**Periksa dulu versi MySQL/MariaDB di Hostinger.** Lokal memakai MySQL 8.0.30
yang batas panjang index-nya 3072 byte. Kalau Hostinger ternyata MariaDB lama,
batasnya 191 karakter untuk utf8mb4 dan sebagian kolom Beregam harus dipendekkan.
Cek sebelum menulis migration, bukan sesudah.

## Perbedaan yang disengaja dengan tabel produksi

Tabel yang sekarang berjalan punya `ON UPDATE CURRENT_TIMESTAMP(3)` pada kolom
`updated_at`. SQL di sini tidak memuatnya, dan itu bukan kelalaian:

`CURRENT_TIMESTAMP` memakai zona waktu server MySQL. Komputer pengembangan
(Laragon) memakai WIB, Hostinger kemungkinan UTC - artinya kejadian yang sama
tersimpan dengan selisih 7 jam tergantung mesin mana yang menulisnya, dan
selisih itu baru ketahuan saat ada yang menghitung laporan bulanan.

Karena itu `updated_at` selalu diisi kode lewat `$onUpdate(() => new Date())`
di `src/lib/db/schema.ts`, dengan pool koneksi diatur `timezone: "Z"`.
Nilai yang masuk database dijamin UTC, apa pun zona waktu servernya.

Kolom `ON UPDATE` yang sudah terlanjur ada di produksi dibiarkan saja - ia
tidak pernah terpakai karena kode selalu mengirim nilainya sendiri.
