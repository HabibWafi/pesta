import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { permintaanData } from "@/lib/db/schema";
import { lampiranValid, permintaanDataSchema } from "@/lib/schemas/permintaan-data";
import { beritahuPermohonanBaru } from "@/lib/beregam/notifikasi";
import * as z from "zod";

export async function POST(req: Request) {
  try {
    // multipart/form-data, bukan JSON - satu-satunya cara menerima berkas
    // lampiran bersamaan dengan field teks lainnya dalam satu permintaan.
    const form = await req.formData();
    const ambil = (kunci: string) => {
      const nilai = form.get(kunci);
      return typeof nilai === "string" ? nilai : undefined;
    };

    const data = permintaanDataSchema.parse({
      nama: ambil("nama"),
      instansi: ambil("instansi"),
      alamat: ambil("alamat"),
      noHp: ambil("noHp"),
      email: ambil("email"),
      jenisData: ambil("jenisData"),
      keperluan: ambil("keperluan"),
      formatDiinginkan: ambil("formatDiinginkan"),
      catatan: ambil("catatan"),
    });

    // Lampiran opsional. Divalidasi di sini SECARA OTORITATIF - pemeriksaan
    // di sisi klien hanya kenyamanan, bisa dilewati siapa pun.
    let lampiranNama: string | null = null;
    let lampiranTipe: string | null = null;
    let lampiranUkuran: number | null = null;
    let lampiranData: Buffer | null = null;

    const berkas = form.get("lampiran");
    if (berkas instanceof File && berkas.size > 0) {
      const cekLampiran = lampiranValid(berkas.name, berkas.size);
      if (!cekLampiran.ok) {
        return NextResponse.json({ success: false, message: cekLampiran.pesan }, { status: 400 });
      }
      lampiranNama = berkas.name.slice(0, 255);
      lampiranTipe = (berkas.type || "application/octet-stream").slice(0, 150);
      lampiranUkuran = berkas.size;
      lampiranData = Buffer.from(await berkas.arrayBuffer());
    }

    const [inserted] = await db
      .insert(permintaanData)
      .values({
        nama: data.nama,
        asalInstansi: data.instansi,
        alamat: data.alamat,
        noHp: data.noHp,
        email: data.email,
        jenisData: data.jenisData,
        keperluan: data.keperluan,
        formatDiinginkan: data.formatDiinginkan,
        catatan: data.catatan || null,
        status: "PENDING",
        sumber: "WEB",
        lampiranNama,
        lampiranTipe,
        lampiranUkuran,
        lampiranData,
      })
      .$returningId();

    const [newRequest] = await db
      .select({
        id: permintaanData.id,
        nama: permintaanData.nama,
        asalInstansi: permintaanData.asalInstansi,
        alamat: permintaanData.alamat,
        noHp: permintaanData.noHp,
        email: permintaanData.email,
        jenisData: permintaanData.jenisData,
        keperluan: permintaanData.keperluan,
        formatDiinginkan: permintaanData.formatDiinginkan,
        catatan: permintaanData.catatan,
        status: permintaanData.status,
        sumber: permintaanData.sumber,
        lampiranNama: permintaanData.lampiranNama,
        createdAt: permintaanData.createdAt,
      }) // tanpa lampiranData - tidak perlu mengirim ulang isi berkas ke klien
      .from(permintaanData)
      .where(eq(permintaanData.id, inserted.id))
      .limit(1);

    await beritahuPermohonanBaru({
      jenis: "data",
      id: inserted.id,
      nama: data.nama,
      sumber: "WEB",
      kontak: data.noHp,
      baris: [
        `Instansi: ${data.instansi}`,
        `Data diminta: ${data.jenisData}`,
        `Keperluan: ${data.keperluan}`,
        lampiranNama ? `Ada lampiran: ${lampiranNama}` : "",
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Permintaan data berhasil didaftarkan ke sistem BPS Musi Rawas.",
        data: newRequest,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }

    console.error("API Permintaan Data Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses permintaan data. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
