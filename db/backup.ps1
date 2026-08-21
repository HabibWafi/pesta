<#
    Backup database PESTA.

    Git menyimpan kode, BUKAN isi database. Riwayat pesan kontak, permohonan
    ViDCon, aduan, dan nanti seluruh percakapan WhatsApp tidak pernah ikut
    ter-push ke GitHub. Skrip ini yang melindunginya.

    Pakai:
        npm run db:backup                     # database lokal (Laragon)
        npm run db:backup -- -KeepDays 60     # simpan 60 hari terakhir

    Hasil disimpan di db/backup/ yang sudah di-gitignore.

    PENTING: salin berkas hasilnya ke LUAR komputer ini (Drive, HDD eksternal).
    Backup yang hanya ada di komputer yang sama tidak melindungi dari komputer
    yang rusak - persis kejadian yang menghilangkan pekerjaan Beregam
    sebelumnya.
#>

[CmdletBinding()]
param(
    [string] $DbName   = "pesta",
    [string] $DbUser   = "root",
    [string] $DbPass   = "",
    [string] $DbHost   = "127.0.0.1",
    [int]    $DbPort   = 3306,

    # Simpan berapa hari backup lama sebelum dibersihkan otomatis.
    [int]    $KeepDays = 30,

    # Lokasi mysqldump. Default mengikuti Laragon di komputer ini.
    [string] $MysqlDumpPath = "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqldump.exe"
)

$ErrorActionPreference = "Stop"

$repoRoot  = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $repoRoot "db\backup"

if (-not (Test-Path $MysqlDumpPath)) {
    Write-Host "mysqldump tidak ditemukan di:" -ForegroundColor Red
    Write-Host "  $MysqlDumpPath"
    Write-Host ""
    Write-Host "Cari lokasinya lalu jalankan ulang dengan parameter:" -ForegroundColor Yellow
    Write-Host '  npm run db:backup -- -MysqlDumpPath "D:\path\ke\mysqldump.exe"'
    exit 1
}

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}

$stamp   = Get-Date -Format "yyyy-MM-dd_HHmm"
$outFile = Join-Path $backupDir "$DbName`_$stamp.sql"

Write-Host "Membackup database '$DbName' dari $DbHost`:$DbPort ..." -ForegroundColor Cyan

# --single-transaction  : snapshot konsisten tanpa mengunci tabel (InnoDB)
# --routines --triggers : ikut sertakan stored routine dan trigger
# --default-character-set: jaga agar teks Indonesia tidak rusak
$dumpArgs = @(
    "--host=$DbHost"
    "--port=$DbPort"
    "--user=$DbUser"
    "--single-transaction"
    "--routines"
    "--triggers"
    "--default-character-set=utf8mb4"
    $DbName
)
if ($DbPass -ne "") { $dumpArgs = @("--password=$DbPass") + $dumpArgs }

& $MysqlDumpPath @dumpArgs | Out-File -FilePath $outFile -Encoding utf8

if (-not (Test-Path $outFile)) {
    Write-Host "Backup GAGAL: berkas tidak terbentuk." -ForegroundColor Red
    exit 1
}

$sizeKb = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
if ($sizeKb -lt 1) {
    Write-Host "Backup GAGAL: berkas kosong. Periksa kredensial database." -ForegroundColor Red
    Remove-Item $outFile -Force
    exit 1
}

Write-Host "Berhasil: $outFile  ($sizeKb KB)" -ForegroundColor Green

# Bersihkan backup lama.
$cutoff = (Get-Date).AddDays(-$KeepDays)
$old = Get-ChildItem -Path $backupDir -Filter "$DbName`_*.sql" |
       Where-Object { $_.LastWriteTime -lt $cutoff }
if ($old) {
    $old | Remove-Item -Force
    Write-Host "Dibersihkan: $($old.Count) backup lebih tua dari $KeepDays hari." -ForegroundColor DarkGray
}

$total = (Get-ChildItem -Path $backupDir -Filter "$DbName`_*.sql").Count
Write-Host ""
Write-Host "$total backup tersimpan di db\backup\" -ForegroundColor DarkGray
Write-Host ""
Write-Host "LANGKAH BERIKUTNYA - jangan dilewati:" -ForegroundColor Yellow
Write-Host "  Salin berkas ini ke luar komputer (Google Drive / HDD eksternal)."
Write-Host "  Backup yang hanya ada di komputer yang sama tidak melindungi"
Write-Host "  dari komputer yang rusak."
