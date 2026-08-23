import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vidconRequests } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth";
import { kirimUndangan, siapkanUndangan } from "@/lib/beregam/undangan-vidcon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ambilPermohonan(idTeks: string) {
  const id = Number(idTeks);
  if (!id) return null;
  const [v] = await db.select().from(vidconRequests).where(eq(vidconRequests.id, id)).limit(1);
  return v ?? null;
}

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const POLA_JAM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Jadwal yang dipakai untuk undangan ini.
 *
 * Petugas boleh menawarkan jadwal lain daripada yang diminta warga - jam
 * yang diminta bisa saja bentrok atau di luar jam layanan. Yang tidak boleh
 * adalah undangan menyebut jadwal A sementara yang tersimpan di sistem
 * jadwal B; karena itu penggantinya divalidasi di sini, lalu dipakai untuk
 * KEDUANYA - isi undangan sekaligus baris permohonan.
 *
 * Kosong berarti "pakai jadwal yang sudah ada".
 */
function jadwalDipakai(
  asli: { tanggal: string; jam: string },
  usul: { tanggal?: unknown; jam?: unknown }
): { ok: true; tanggal: string; jam: string; berubah: boolean } | { ok: false; alasan: string } {
  const tanggal = typeof usul.tanggal === "string" && usul.tanggal.trim() ? usul.tanggal.trim() : asli.tanggal;
  const jam = typeof usul.jam === "string" && usul.jam.trim() ? usul.jam.trim() : asli.jam;

  if (!POLA_TANGGAL.test(tanggal)) {
    return { ok: false, alasan: "Tanggal tidak sah. Gunakan format tahun-bulan-tanggal." };
  }
  if (!POLA_JAM.test(jam)) {
    return { ok: false, alasan: "Jam tidak sah. Gunakan format 24 jam, mis. 09:30." };
  }

  // Tanggal yang tidak ada di kalender (mis. 2026-02-31) lolos pola di atas.
  const d = new Date(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== tanggal) {
    return { ok: false, alasan: "Tanggal itu tidak ada di kalender." };
  }

  return { ok: true, tanggal, jam, berubah: tanggal !== asli.tanggal || jam !== asli.jam };
}

/**
 * PRATINJAU undangan - tidak mengirim apa pun.
 *
 * Petugas melihat lebih dulu teks persis yang akan diterima warga, berikut
 * nomor tujuannya. Undangan ini keluar atas nama BPS; menekan tombol kirim
 * tanpa tahu isinya bukan cara yang pantas untuk itu.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesi = await getAdminSession();
  if (!sesi) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const v = await ambilPermohonan(id);
  if (!v) {
    return NextResponse.json({ success: false, message: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  // Pratinjau boleh memakai jadwal usulan, supaya petugas melihat langsung
  // akibat penggantian jadwal sebelum benar-benar mengirimnya.
  const q = new URL(req.url).searchParams;
  const jadwal = jadwalDipakai(v, { tanggal: q.get("tanggal"), jam: q.get("jam") });
  if (!jadwal.ok) {
    return NextResponse.json({ success: false, message: jadwal.alasan }, { status: 422 });
  }

  const siap = await siapkanUndangan({ ...v, tanggal: jadwal.tanggal, jam: jadwal.jam });
  if (!siap.ok) {
    return NextResponse.json({ success: false, message: siap.alasan }, { status: 422 });
  }

  return NextResponse.json({
    success: true,
    nomorWa: siap.nomorWa,
    pesan: siap.pesan,
    sudahDiproses: v.status === "APPROVED" || v.status === "COMPLETED",
    jadwalAsli: { tanggal: v.tanggal, jam: v.jam },
    jadwalDipakai: { tanggal: jadwal.tanggal, jam: jadwal.jam },
    jadwalBerubah: jadwal.berubah,
  });
}

/**
 * Memproses permohonan: kirim undangan ViDCon, lalu tandai disetujui.
 *
 * URUTANNYA DISENGAJA - kirim dulu, baru ubah status.
 *
 * Kalau statusnya diubah lebih dulu lalu pengiriman gagal, panel akan
 * menampilkan "DISETUJUI" untuk warga yang sebenarnya tidak pernah menerima
 * undangan apa pun. Tidak ada yang akan menyadarinya sampai warga tidak
 * muncul di jam konsultasi. Dengan urutan ini, kegagalan pengiriman berarti
 * permohonannya tetap PENDING - masih terlihat sebagai pekerjaan yang belum
 * selesai, yang memang benar.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesi = await getAdminSession();
  if (!sesi) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const v = await ambilPermohonan(id);
  if (!v) {
    return NextResponse.json({ success: false, message: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const usul = await req.json().catch(() => ({}));
  const jadwal = jadwalDipakai(v, usul as { tanggal?: unknown; jam?: unknown });
  if (!jadwal.ok) {
    return NextResponse.json({ success: false, message: jadwal.alasan }, { status: 422 });
  }

  const siap = await siapkanUndangan({ ...v, tanggal: jadwal.tanggal, jam: jadwal.jam });
  if (!siap.ok) {
    return NextResponse.json({ success: false, message: siap.alasan }, { status: 422 });
  }

  try {
    await kirimUndangan(siap.nomorWa, siap.pesan);
  } catch (error) {
    console.error("[vidcon] gagal mengantrekan undangan:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "Undangan gagal diantrekan, jadi status permohonan sengaja TIDAK diubah. " +
          "Periksa panel Beregam lalu coba lagi.",
      },
      { status: 500 }
    );
  }

  const catatan = [
    v.catatanAdmin?.trim(),
    jadwal.berubah
      ? `Jadwal diubah dari ${v.tanggal} ${v.jam} menjadi ${jadwal.tanggal} ${jadwal.jam} oleh ${sesi.name}.`
      : "",
    `Undangan ViDCon dikirim ke WhatsApp +${siap.nomorWa} oleh ${sesi.name}.`,
  ]
    .filter(Boolean)
    .join("\n");

  /*
   * Jadwal di baris permohonan ikut diperbarui, bukan hanya di isi undangan.
   *
   * Kalau hanya undangannya yang memakai jadwal baru, panel akan terus
   * menampilkan jadwal lama - dan petugas lain yang membukanya besok akan
   * menyiapkan rapat di jam yang salah, sementara warga datang di jam yang
   * tertulis di WhatsApp-nya.
   */
  await db
    .update(vidconRequests)
    .set({
      status: "APPROVED",
      tanggal: jadwal.tanggal,
      jam: jadwal.jam,
      catatanAdmin: catatan.slice(0, 2000),
    })
    .where(eq(vidconRequests.id, v.id));

  return NextResponse.json({
    success: true,
    message:
      `Undangan terkirim ke +${siap.nomorWa}. Status menjadi DISETUJUI` +
      (jadwal.berubah ? `, jadwal diperbarui ke ${jadwal.tanggal} pukul ${jadwal.jam} WIB.` : "."),
    nomorWa: siap.nomorWa,
    jadwalBerubah: jadwal.berubah,
  });
}
