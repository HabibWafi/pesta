# PRD AI Asisten Sinta

## Ringkasan

Sinta adalah asisten layanan PESTA yang memberi jawaban konsisten melalui web PESTA dan WhatsApp Beregam. Sinta memakai pola retrieval-first: sistem mencari materi pada basis pengetahuan yang telah disetujui, mengambil angka melalui Dashboard Data, lalu menyusun respons dari hasil terverifikasi. Model generatif bersifat opsional dan hanya membantu bahasa nonnumerik. Model tidak boleh menghasilkan angka statistik.

Dokumen ini menggambarkan target produk dan batas implementasinya. Halaman `/sinta`, kontrak pekerjaan AI, tabel antrean, dan pengaman angka telah tersedia sebagian. Worker inferensi, pengalaman chat web lengkap, serta operasi produksi masih berstatus **Dalam pengembangan** sampai seluruh kriteria penerimaan dipenuhi.

## Status produk

| Komponen | Status | Catatan |
| --- | --- | --- |
| Halaman `/sinta` | Placeholder, di balik feature flag | Belum menjadi chat produksi |
| Kontrak `IndicatorQuery` dan `VerifiedFact` | Sudah tersedia | Menjadi jalur fakta numerik |
| Antrean `beregam_ai_jobs` | Sudah tersedia pada sisi server | Diproses worker PC kantor |
| Kanal pekerjaan `wa` dan `web` | Sudah tersedia pada kontrak | Implementasi web belum lengkap |
| Validasi respons statistik berbasis token | Sudah tersedia | Angka disisipkan oleh kode |
| Bot Beregam deterministik | Sudah tersedia | AI belum aktif pada alur utama |
| Worker AI pada PC kantor | Dalam pengembangan | Server Hostinger tidak menjalankan model |
| Chat web Sinta | Direncanakan | Memerlukan sesi, pesan, API, dan polling |
| Basis pengetahuan terkurasi dan alur persetujuan | Dalam pengembangan | Konten harus memiliki sumber dan status |

## Masalah yang diselesaikan

Warga mengakses layanan statistik melalui kanal yang berbeda dan sering mengulang pertanyaan tentang layanan, publikasi, permintaan data, jadwal, serta indikator. Jawaban dapat terlambat di luar jam layanan, sementara petugas perlu menjaga ketepatan isi dan tidak boleh menyampaikan angka tanpa sumber.

Sinta menyediakan titik bantu awal yang sama pada web dan WhatsApp. Sistem menjawab pertanyaan yang memiliki dasar pengetahuan, meminta klarifikasi jika konteks kurang, dan menyerahkan percakapan kepada petugas saat risiko atau kebutuhan pengguna melebihi kemampuan otomatis.

## Tujuan

1. Menjawab pertanyaan layanan umum dari basis pengetahuan yang disetujui.
2. Menjawab pertanyaan statistik hanya dari fakta Dashboard Data yang telah dipublikasikan.
3. Menjaga konsistensi jawaban di web PESTA dan WhatsApp Beregam.
4. Mendukung pengguna dengan bahasa sederhana, struktur ringkas, dan pilihan eskalasi yang jelas.
5. Mengurangi pertanyaan berulang tanpa menghilangkan akses ke petugas.
6. Menyediakan jejak sumber, status, dan alasan eskalasi untuk audit layanan.

## Bukan tujuan

- Membuat angka, proyeksi, estimasi, atau interpretasi statistik baru.
- Memberi keputusan administratif final atau menggantikan petugas.
- Menjawab dari internet terbuka tanpa kurasi.
- Memproses data pribadi yang tidak diperlukan untuk layanan.
- Menjalankan model AI pada Hostinger.
- Mengirim pesan WhatsApp langsung dari PESTA.
- Menjawab otomatis ketika sesi Beregam berada pada mode manual.

## Pengguna dan kebutuhan

| Pengguna | Kebutuhan utama |
| --- | --- |
| Warga | Jawaban cepat, sumber yang jelas, dan jalan menuju petugas |
| Lansia dan pengguna dengan literasi digital terbatas | Pilihan singkat, satu pertanyaan per langkah, dan bahasa sederhana |
| Penyandang disabilitas | Chat yang dapat dioperasikan dengan papan ketik, pembaca layar, pembesaran teks, dan input alternatif |
| Pengguna WhatsApp | Jawaban ringkas yang tetap memiliki tautan atau sumber |
| Petugas layanan | Ringkasan konteks, alasan handoff, sumber yang dipakai, dan kendali mode manual |
| Admin pengetahuan | Menambah, meninjau, memublikasikan, menarik, dan memperbarui materi |
| Auditor/pengelola | Melihat jejak keputusan tanpa membuka data pribadi yang tidak relevan |

## Prinsip produk

1. **Jawaban mengikuti sumber.** Konten harus berasal dari dokumen atau fakta yang berstatus terpublikasi.
2. **Angka berasal dari kode.** Model bahasa tidak menerima angka mentah dan tidak menulis angka statistik.
3. **Manual berarti diam.** Saat sesi WhatsApp berada pada mode manual, bot hanya mencatat pesan masuk lalu berhenti.
4. **Klarifikasi lebih aman daripada tebakan.** Sistem tidak menebak indikator, wilayah, periode, identitas, atau maksud layanan.
5. **Handoff mempertahankan konteks.** Petugas menerima riwayat yang relevan, sumber, dan alasan eskalasi.
6. **Satu pengetahuan, banyak kanal.** Web dan WhatsApp memakai konten, kontrak, serta aturan keselamatan yang sama.
7. **Fitur dapat dimatikan.** AI generatif, chat web, dan kanal WhatsApp memiliki feature flag terpisah.

## Arsitektur target

### Komponen

- **PESTA di Hostinger** menyimpan basis pengetahuan, sesi, pesan, pekerjaan AI, hasil, dan outbox. PESTA tidak menjalankan model dan tidak mengirim WhatsApp.
- **Worker Beregam di PC kantor** melakukan polling terhadap pekerjaan, mengambil pengetahuan yang diizinkan, menjalankan retrieval atau inferensi, lalu mengirim hasil terstruktur.
- **WAHA pada PC kantor** menghubungkan worker ke WhatsApp. PESTA menulis outbox; worker yang mengirim pesan.
- **Dashboard Data** menyediakan fakta statistik terverifikasi melalui `IndicatorQuery`.
- **Sinta web** membuat pesan pada PESTA dan mengambil balasan dengan polling pada rilis awal.

### Alur umum

1. Pesan masuk dicatat bersama kanal dan identitas sesi yang dipseudonimkan.
2. Router mengklasifikasikan kebutuhan: menu deterministik, layanan, pengetahuan, statistik, atau handoff.
3. Menu dan transaksi formulir diproses tanpa model.
4. Pertanyaan pengetahuan menjalankan retrieval pada konten terpublikasi.
5. Pertanyaan statistik dibentuk menjadi `IndicatorQuery` dan diproses Dashboard Data.
6. AI generatif, bila aktif, hanya merapikan bahasa nonnumerik dari konteks yang dibatasi.
7. Validator memeriksa sumber, format, token, keamanan, dan keputusan handoff.
8. PESTA menyimpan hasil. Web membacanya melalui polling; WhatsApp menerima pesan melalui outbox dan worker.

## Alur percakapan

### Menu deterministik

Menu awal memuat pilihan layanan utama PESTA, informasi publikasi, permintaan data, konsultasi, pengaduan, aksesibilitas, dan bicara dengan petugas. Urutan dan label mengikuti konfigurasi PESTA. Model tidak menentukan perubahan status permohonan atau mengirim formulir atas nama pengguna.

### Pertanyaan pengetahuan

1. Sistem menormalkan teks dan mendeteksi bahasa.
2. Retrieval mencari potongan konten berstatus terpublikasi.
3. Jika relevansi di bawah ambang, Sinta meminta klarifikasi atau menawarkan petugas.
4. Jika hasil cukup, Sinta menyusun jawaban ringkas dan menyertakan sumber.
5. Jawaban disimpan bersama ID sumber, versi, dan mode pembentukan respons.

### Pertanyaan statistik

1. Sistem mengidentifikasi kandidat indikator, wilayah, periode, dan operasi.
2. Jika ada lebih dari satu kemungkinan, Sinta meminta pengguna memilih.
3. PESTA mengirim `IndicatorQuery` ke endpoint indikator.
4. Endpoint mengembalikan `VerifiedFact` dari versi terpublikasi.
5. Kode mengganti nilai dengan token seperti `[[FACT_1]]` sebelum konteks nonnumerik masuk ke model opsional.
6. Validator menolak keluaran model yang mengandung digit, token asing, atau token yang hilang.
7. Kode menyisipkan nilai, satuan, periode, wilayah, dan sumber setelah validasi.
8. Jika tidak ada fakta valid, Sinta menyatakan data belum tersedia dan menawarkan tautan dashboard atau petugas.

### Handoff ke petugas

Handoff terjadi ketika:

- pengguna memintanya;
- pertanyaan menyangkut data pribadi, pengaduan sensitif, atau keputusan administratif;
- retrieval tidak menghasilkan sumber yang cukup;
- kueri statistik ambigu setelah klarifikasi;
- validator menolak hasil;
- sistem mengalami kegagalan berulang;
- petugas mengambil alih sesi.

Pada WhatsApp, pengambilalihan mengubah sesi ke mode manual. Setelah itu bot tidak membuat balasan apa pun sampai petugas mengembalikan sesi ke mode otomatis sesuai prosedur.

## Basis pengetahuan

### Sumber yang diizinkan

- halaman resmi PESTA dan BPS Kabupaten Musi Rawas;
- SOP dan daftar layanan yang disetujui;
- publikasi, metadata, serta FAQ resmi;
- materi internal yang secara eksplisit diberi status boleh digunakan untuk layanan publik;
- fakta statistik dari Dashboard Data.

### Siklus hidup konten

Setiap dokumen atau potongan pengetahuan memiliki pemilik, sumber, versi, waktu berlaku, status draf/review/publikasi/ditarik, serta tingkat keterbukaan. Perubahan konten membuat versi baru. Konten yang ditarik tidak ikut retrieval baru, tetapi referensi historis tetap dapat diaudit.

### Larangan

- Internet terbuka tidak menjadi sumber otomatis.
- Dokumen internal terbatas tidak boleh masuk indeks publik.
- Konten tanpa sumber atau pemilik tidak boleh dipublikasikan.
- Testimoni tidak boleh ditayangkan tanpa catatan sumber yang dapat ditelusuri.

## Model data target

### Tabel yang sudah ada

- `beregam_ai_jobs` untuk pekerjaan dan hasil AI.
- tabel sesi, pesan, outbox, indikator, dan basis pengetahuan Beregam sesuai skema modul.

### Tabel yang direncanakan untuk web

#### `beregam_web_sessions`

| Kolom | Fungsi |
| --- | --- |
| `id` | ID acak yang tidak menyingkap urutan |
| `public_token_hash` | Hash token sesi browser |
| `mode` | `auto`, `manual`, atau `closed` |
| `locale` | Bahasa antarmuka |
| `created_at`, `updated_at`, `expires_at` | Waktu UTC dan masa sesi |
| `consent_version` | Versi pemberitahuan privasi yang diterima |

#### `beregam_web_messages`

| Kolom | Fungsi |
| --- | --- |
| `id`, `session_id` | Identitas pesan dan sesi |
| `direction` | `inbound` atau `outbound` |
| `sender_type` | `user`, `assistant`, `agent`, atau `system` |
| `body` | Isi pesan yang telah melewati batas ukuran |
| `status` | `queued`, `processing`, `sent`, `failed`, atau `blocked` |
| `source_refs` | Referensi sumber terstruktur |
| `created_at` | Waktu UTC |

`beregam_ai_jobs` dapat menambah `web_session_id` opsional. Relasi harus memakai indeks yang aman untuk versi MySQL/MariaDB produksi setelah versinya diverifikasi.

## Kontrak API target

### Chat web

#### `POST /api/sinta/messages`

Membuat sesi jika token belum ada, memvalidasi pesan, menyimpan pesan masuk, dan mengantrekan pekerjaan bila diperlukan. Respons awal tidak menunggu model.

Contoh bentuk respons:

```json
{
  "success": true,
  "sessionId": "opaque-id",
  "messageId": "opaque-id",
  "status": "queued"
}
```

#### `GET /api/sinta/messages?after=<cursor>`

Mengambil pesan baru secara polling. Respons memuat cursor berikutnya, status pekerjaan, sumber yang boleh ditampilkan, dan penanda handoff.

### Pekerjaan worker

Kontrak berada pada `src/lib/beregam/contracts.ts` dan disalin ke repositori worker melalui `contracts:sync`. Setiap permintaan worker wajib membawa `X-Contracts-Version`. Ketidakcocokan versi harus gagal dengan pesan yang jelas.

### Hasil AI terstruktur

Hasil tidak berupa teks bebas tunggal. Gunakan union bertanda:

```ts
type SintaResult =
  | { kind: "knowledge"; text: string; sourceIds: string[] }
  | { kind: "indicator"; template: string; facts: VerifiedFact[]; sourceIds: string[] }
  | { kind: "handoff"; reason: string; queue?: string };
```

Validator server memeriksa bentuk, sumber, status konten, token fakta, batas panjang, serta karakter yang tidak diizinkan sebelum membuat pesan keluar.

## Pengalaman chat web

- Tombol Sinta menjelaskan bahwa jawaban otomatis dapat dialihkan ke petugas.
- Pesan pengguna dan balasan memiliki label penulis yang dapat dibaca pembaca layar.
- Status mengantre, memproses, gagal, dan menunggu petugas diumumkan melalui live region.
- Fokus tidak berpindah otomatis setiap balasan.
- Pengguna dapat menavigasi riwayat dengan papan ketik.
- Tautan sumber memiliki label yang menjelaskan tujuan.
- Tersedia tombol hentikan, hapus sesi lokal, ulangi, dan hubungi petugas.
- Jawaban panjang dipecah menjadi paragraf pendek; pilihan disajikan sebagai tombol dan tetap dapat diketik.
- Widget aksesibilitas PESTA dapat membantu, tetapi chat harus memenuhi aksesibilitas dasar tanpa widget.

## Adaptasi untuk kelompok inklusif

### Lansia dan literasi digital terbatas

- Satu pertanyaan per langkah.
- Maksimum pilihan utama dibatasi agar tidak membebani layar.
- Istilah teknis disertai penjelasan singkat.
- Konfirmasi sebelum tindakan yang mengirim permohonan.

### Pengguna low vision atau buta

- Struktur landmark dan heading yang benar.
- Pembaca layar menerima status tanpa membaca ulang seluruh chat.
- Kontras, pembesaran, dan urutan fokus diuji pada perangkat nyata.

### Pengguna dengan hambatan motorik

- Tidak ada fungsi yang hanya tersedia melalui drag, hover, atau batas waktu singkat.
- Target sentuh memadai dan pintasan papan ketik tidak bertabrakan dengan teknologi bantu.

### Pengguna dengan hambatan kognitif atau belajar

- Bahasa langsung, langkah berurutan, dan ringkasan pilihan.
- Pengguna dapat kembali ke menu tanpa kehilangan konteks penting.
- Pesan kesalahan menyebut tindakan perbaikan.

### Pengguna dengan hambatan bicara atau dengar

- Seluruh layanan inti tersedia melalui teks.
- Transkrip dan ringkasan tidak menghapus kebutuhan pengguna untuk memeriksa isi sebelum dikirim.

## Keamanan dan privasi

- Token sesi disimpan sebagai hash dan cookie memakai atribut aman yang sesuai.
- Pesan dibatasi ukuran, jenis berkas, dan frekuensi.
- Data pribadi diminimalkan serta tidak dimasukkan ke prompt kecuali dibutuhkan dan diizinkan.
- Nomor telepon tidak pernah ditulis lengkap ke log; gunakan bentuk tersamarkan.
- HMAC dihitung atas raw body sebelum JSON diurai.
- Perbandingan secret memakai `crypto.timingSafeEqual`.
- Model dan retrieval tidak menerima rahasia aplikasi.
- Prompt injection pada dokumen diperlakukan sebagai teks, bukan instruksi.
- Sumber dan cuplikan dikirim ke model dengan pembatas yang eksplisit.
- Kebijakan retensi pesan, hasil, dan audit ditetapkan sebelum rilis; penghapusan mengikuti kebutuhan hukum dan layanan.
- Pengguna memperoleh pemberitahuan bahwa sebagian jawaban dihasilkan otomatis serta cara menghubungi petugas.

## Fallback dan kegagalan

| Kondisi | Respons sistem |
| --- | --- |
| Worker tidak aktif | Menu deterministik tetap berjalan; pertanyaan AI mengantre atau dialihkan |
| Retrieval tanpa hasil | Minta klarifikasi atau tawarkan petugas |
| Dashboard tidak menemukan fakta | Nyatakan data tidak tersedia; jangan menebak |
| Hasil model gagal validasi | Buang hasil, catat alasan aman, gunakan templat fallback atau handoff |
| Versi kontrak berbeda | Tolak pekerjaan dan tampilkan peringatan operasional |
| Outbox gagal dikirim | Retry dengan idempotency key dan batas percobaan |
| Sesi WhatsApp manual | Catat pesan, tanpa balasan bot |
| Batas permintaan terlampaui | Balas 429 dengan waktu tunggu yang wajar |

## Persyaratan nonfungsional

### Kinerja

- `POST /api/sinta/messages` menyimpan dan mengantrekan pekerjaan tanpa menunggu inferensi.
- Polling memakai cursor, interval adaptif, dan batas jumlah pesan.
- Pekerjaan memakai retry terbatas, timeout, status yang dapat dipantau, dan idempotency key.
- Worker membatasi konkurensi agar tidak membebani Hostinger atau PC kantor.

### Keandalan

- Webhook mengakui penerimaan sebelum pemrosesan berat.
- Pekerjaan yang sama tidak menghasilkan dua balasan.
- Outbox diklaim dengan transaksi dan `SELECT ... FOR UPDATE` melalui Drizzle.
- Pesan masuk selalu dicatat sebelum routing, kecuali permintaan ditolak oleh batas keamanan.
- Ketika mode berubah ke manual, pekerjaan otomatis yang belum dikirim dibatalkan atau ditahan.

### Observabilitas

Catat ID korelasi, kanal, jenis alur, status pekerjaan, sumber yang dipakai, latensi tahap, dan alasan handoff. Log tidak memuat secret, prompt lengkap yang mengandung data pribadi, alamat IP mentah, atau nomor telepon lengkap.

## Metrik produk

Target numerik ditetapkan setelah baseline tersedia dan disetujui. Metrik yang dipantau:

- pertanyaan yang selesai melalui menu deterministik;
- jawaban pengetahuan dengan sumber valid;
- kueri statistik yang menghasilkan fakta terverifikasi;
- permintaan klarifikasi;
- handoff serta alasan handoff;
- hasil model yang ditolak validator;
- waktu dari pesan masuk sampai balasan atau handoff;
- percakapan mode manual yang tidak menerima balasan bot;
- temuan uji tugas dengan pengguna disabilitas dan lansia.

## Feature flag

Feature flag dipisahkan agar kegagalan satu kemampuan tidak mematikan layanan lain:

- `tampilan.sinta` untuk halaman dan chat web;
- `beregam.ai.enabled` untuk pekerjaan generatif;
- `beregam.wa.autoReply` untuk balasan otomatis WhatsApp;
- `sinta.indicatorAnswers` untuk jawaban statistik;
- `sinta.knowledgeAnswers` untuk retrieval pengetahuan.

Nama aktual mengikuti mekanisme konfigurasi proyek. Semua flag default mati pada produksi sampai kesiapan dikonfirmasi.

## Peluncuran

### Tahap 0 Kontrak dan keselamatan

- Bekukan versi kontrak web/worker.
- Uji raw-body HMAC, timing-safe secret, idempotensi, masking nomor, dan mode manual.
- Uji validator angka dengan keluaran berisi digit, token asing, token hilang, dan urutan token salah.

### Tahap 1 Basis pengetahuan internal

- Masukkan konten prioritas beserta sumber, pemilik, dan masa berlaku.
- Reviewer memublikasikan konten setelah uji retrieval.
- Petugas menguji pertanyaan normal, ambigu, dan berisiko.

### Tahap 2 Sinta web terbatas

- Aktifkan untuk admin dan penguji.
- Uji aksesibilitas dengan pengguna sasaran.
- Pantau antrean, fallback, handoff, dan privasi.

### Tahap 3 Beregam dengan AI terbatas

- Aktifkan pada kelompok pertanyaan berisiko rendah.
- Menu layanan dan formulir tetap deterministik.
- Petugas dapat mengambil alih dan mengembalikan sesi.

### Tahap 4 Rilis bertahap

- Perluas cakupan basis pengetahuan dan indikator setelah review.
- Pantau penolakan validator serta alasan handoff.
- Nonaktifkan flag terkait jika kualitas atau keamanan menurun.

### Rollback

AI generatif dapat dimatikan tanpa mematikan menu, pencatatan pesan, atau handoff. Jika chat web bermasalah, halaman Sinta mengarahkan pengguna ke kanal PESTA yang tersedia. Jika WhatsApp bermasalah, outbox ditahan dan bot tidak mencoba mengirim langsung dari Hostinger.

## Kriteria penerimaan

1. Model tidak dapat menghasilkan angka statistik; seluruh nilai berasal dari `VerifiedFact` dan disisipkan kode.
2. Keluaran model yang mengandung digit atau token tidak sah ditolak sebelum pengguna melihatnya.
3. Setiap jawaban pengetahuan menyimpan referensi sumber terpublikasi.
4. Konten draf, ditolak, ditarik, atau terbatas tidak ikut retrieval publik.
5. Mode manual mencatat pesan masuk dan menghasilkan nol balasan otomatis.
6. PESTA tidak mengirim WhatsApp langsung dan tidak menjalankan model pada Hostinger.
7. Pekerjaan, hasil, dan outbox bersifat idempoten.
8. Ketidakcocokan `X-Contracts-Version` ditolak dengan pesan operasional yang jelas.
9. Nomor telepon selalu tersamarkan di log.
10. HMAC memakai raw body dan secret dibandingkan dengan `timingSafeEqual`.
11. Chat web dapat digunakan dengan papan ketik, pembaca layar, zoom 200 persen, dan tanpa widget aksesibilitas.
12. Handoff menyertakan konteks, sumber, dan alasan tanpa membocorkan data yang tidak diperlukan.
13. Pengguna diberi tahu saat jawaban otomatis digunakan dan dapat meminta petugas kapan saja.
14. Uji build, kontrak, integrasi worker, keamanan, aksesibilitas, dan rollback lulus sebelum flag produksi aktif.

## Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Halusinasi layanan | Retrieval hanya pada konten terpublikasi, sumber wajib, dan fallback handoff |
| Angka statistik salah | Jalur fakta terpisah, token tanpa digit, validator, dan injeksi oleh kode |
| Prompt injection dari dokumen | Konten diperlakukan sebagai data, izin sumber, dan instruksi sistem tidak dicampur |
| Kebocoran data pribadi | Minimisasi, redaksi, retensi, pembatasan prompt, dan log aman |
| Balasan ganda saat petugas mengambil alih | Pemeriksaan mode manual sebelum setiap tahap pengiriman |
| Worker PC tidak tersedia | Menu deterministik dan handoff tetap berjalan; antrean memiliki timeout |
| Kanal memberi jawaban berbeda | Kontrak, basis pengetahuan, dan validator bersama |
| Klaim inklusif tanpa pengujian | Uji tugas bersama pengguna sasaran dan dokumentasikan temuan |

## Keputusan terbuka

- Penyedia dan model lokal/eksternal yang diizinkan pada worker PC.
- Kebijakan retensi untuk web dan WhatsApp.
- Ambang relevansi retrieval serta jumlah sumber maksimum.
- Peran yang boleh memublikasikan basis pengetahuan.
- Jam dan antrean handoff petugas.
- Batas permintaan per sesi dan per kanal.
- Daftar pertanyaan berisiko rendah untuk aktivasi awal.
- Format persetujuan pengguna untuk data pribadi atau lampiran.
- Baseline serta target kualitas setelah uji terbatas.
