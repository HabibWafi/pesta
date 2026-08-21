import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, pengaduans, vidconRequests } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth";
import { bangunCsv, responsCsv, stempelTanggal, type NilaiSel } from "@/lib/csv";
import { labelInklusif } from "@/lib/schemas/inklusi";

export const dynamic = "force-dynamic";

/**
 * Ekspor data layanan sebagai CSV.
 *
 *   /api/admin/ekspor?jenis=vidcon
 *   /api/admin/ekspor?jenis=aduan
 *   /api/admin/ekspor?jenis=kontak
 */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const jenis = new URL(req.url).searchParams.get("jenis");
  const stempel = stempelTanggal();

  try {
    if (jenis === "vidcon") {
      const baris = await db
        .select()
        .from(vidconRequests)
        .orderBy(desc(vidconRequests.createdAt));

      const isi = bangunCsv(
        [
          "id", "nama", "asal_instansi", "alamat", "no_hp", "email",
          "cakupan", "deskripsi", "tanggal", "jam", "status",
          "pendampingan_inklusif", "catatan_inklusif", "catatan_admin", "dibuat",
        ],
        baris.map<NilaiSel[]>((v) => [
          v.id, v.nama, v.asalInstansi, v.alamat, v.noHp, v.email,
          v.cakupan, v.deskripsi, v.tanggal, v.jam, v.status,
          labelInklusif(v.layananInklusif).join(", "),
          v.layananInklusifCatatan, v.catatanAdmin, v.createdAt,
        ])
      );
      return responsCsv(`vidcon-pesta-${stempel}.csv`, isi);
    }

    if (jenis === "aduan") {
      const baris = await db.select().from(pengaduans).orderBy(desc(pengaduans.createdAt));

      const isi = bangunCsv(
        [
          "id", "nama", "jenis_kelamin", "email", "no_hp", "asal_instansi",
          "kategori", "detail", "status", "tanggapan", "dibuat",
        ],
        baris.map<NilaiSel[]>((a) => [
          a.id, a.nama, a.jenisKelamin, a.email, a.noHp, a.asalInstansi,
          a.kategori, a.detail, a.status, a.tanggapan, a.createdAt,
        ])
      );
      return responsCsv(`aduan-pesta-${stempel}.csv`, isi);
    }

    if (jenis === "kontak") {
      const baris = await db.select().from(contacts).orderBy(desc(contacts.createdAt));

      const isi = bangunCsv(
        ["id", "nama", "email", "subjek", "pesan", "status", "dibuat"],
        baris.map<NilaiSel[]>((k) => [
          k.id, k.nama, k.email, k.subjek, k.pesan, k.status, k.createdAt,
        ])
      );
      return responsCsv(`kontak-pesta-${stempel}.csv`, isi);
    }

    return new Response(
      "Parameter 'jenis' harus salah satu dari: vidcon, aduan, kontak",
      { status: 400 }
    );
  } catch (error) {
    console.error("API Admin Ekspor Error:", error);
    return new Response("Gagal membuat berkas ekspor", { status: 500 });
  }
}
