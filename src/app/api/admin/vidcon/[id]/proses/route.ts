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

/**
 * PRATINJAU undangan - tidak mengirim apa pun.
 *
 * Petugas melihat lebih dulu teks persis yang akan diterima warga, berikut
 * nomor tujuannya. Undangan ini keluar atas nama BPS; menekan tombol kirim
 * tanpa tahu isinya bukan cara yang pantas untuk itu.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesi = await getAdminSession();
  if (!sesi) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const v = await ambilPermohonan(id);
  if (!v) {
    return NextResponse.json({ success: false, message: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const siap = await siapkanUndangan(v);
  if (!siap.ok) {
    return NextResponse.json({ success: false, message: siap.alasan }, { status: 422 });
  }

  return NextResponse.json({
    success: true,
    nomorWa: siap.nomorWa,
    pesan: siap.pesan,
    sudahDiproses: v.status === "APPROVED" || v.status === "COMPLETED",
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
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesi = await getAdminSession();
  if (!sesi) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const v = await ambilPermohonan(id);
  if (!v) {
    return NextResponse.json({ success: false, message: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const siap = await siapkanUndangan(v);
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
    `Undangan ViDCon dikirim ke WhatsApp +${siap.nomorWa} oleh ${sesi.name}.`,
  ]
    .filter(Boolean)
    .join("\n");

  await db
    .update(vidconRequests)
    .set({ status: "APPROVED", catatanAdmin: catatan.slice(0, 2000) })
    .where(eq(vidconRequests.id, v.id));

  return NextResponse.json({
    success: true,
    message: `Undangan terkirim ke +${siap.nomorWa}. Status permohonan menjadi DISETUJUI.`,
    nomorWa: siap.nomorWa,
  });
}
