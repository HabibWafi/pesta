import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { beregamFaq } from "@/lib/beregam/db/schema";
import { getAdminSession } from "@/lib/auth";
import { getConfig } from "@/lib/beregam/config";

/**
 * Kelola menu bot Beregam dari admin panel.
 *
 * Satu-satunya tempat isi pesan bot WhatsApp bisa diubah tanpa deploy -
 * sebelumnya cuma bisa lewat db/seed/beregam.mts, yang butuh akses server.
 *
 * ATURAN PENOMORAN: menuKey adalah angka yang benar-benar dibalas warga
 * ("balas dengan angka 1-8"), dan BeregamService mencocokkannya persis ke
 * kolom ini. Karena itu menuKey TIDAK BOLEH diedit bebas dari sini - kalau
 * dua baris kebetulan sama-sama "3", jawabMenu() hanya akan pernah
 * menemukan salah satunya, dan yang lain jadi menu mati yang terlihat di
 * daftar tapi tidak pernah bisa dipilih.
 *
 * Sebagai gantinya, urutan tampil (sortOrder) yang bisa diatur bebas, dan
 * menuKey SELALU dihitung ulang dari urutan itu - hanya di antara baris
 * yang aktif, sehingga menonaktifkan satu menu di tengah tidak meninggalkan
 * lubang angka yang terlihat aneh bagi warga (mis. 1, 2, 4, 5 - hilang 3).
 */

const menuSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
  answer: z.string().trim().min(1, "Jawaban tidak boleh kosong"),
  isActive: z.boolean().default(true),
});

/** Menomori ulang menuKey 1..N hanya di antara baris aktif, tanpa lubang. */
async function nomoriUlang(): Promise<void> {
  const aktif = await db
    .select({ id: beregamFaq.id })
    .from(beregamFaq)
    .where(and(eq(beregamFaq.isActive, true), isNull(beregamFaq.parentKey)))
    .orderBy(asc(beregamFaq.sortOrder), asc(beregamFaq.id));

  for (const [i, baris] of aktif.entries()) {
    await db
      .update(beregamFaq)
      .set({ menuKey: String(i + 1), sortOrder: i })
      .where(eq(beregamFaq.id, baris.id));
  }
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const menu = await db
      .select()
      .from(beregamFaq)
      .where(isNull(beregamFaq.parentKey))
      .orderBy(asc(beregamFaq.sortOrder), asc(beregamFaq.id));

    // Info operasional yang berguna dilihat admin di layar yang sama -
    // sumbernya environment, bukan database, jadi hanya ditampilkan (tidak
    // bisa diedit dari sini).
    let konfigurasi: {
      rateLimitPerMenit: number;
      rateLimitHarian: number;
      jamBukaTutup: string;
      notifikasiPetugasAktif: boolean;
    } | null = null;

    try {
      const cfg = getConfig();
      konfigurasi = {
        rateLimitPerMenit: cfg.rateLimit.perMinute,
        rateLimitHarian: cfg.rateLimit.dailyCap,
        jamBukaTutup: `${String(cfg.jamLayanan.jamBuka).padStart(2, "0")}.00 - ${String(cfg.jamLayanan.jamTutup).padStart(2, "0")}.00 WIB`,
        notifikasiPetugasAktif: Boolean(cfg.staffWaNumber),
      };
    } catch {
      // Modul belum dikonfigurasi di server ini - menu tetap bisa dikelola,
      // hanya panel info yang tidak ditampilkan.
    }

    return NextResponse.json({ success: true, menu, konfigurasi });
  } catch (error) {
    console.error("API Beregam Menu GET Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat menu" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = menuSchema.parse(await req.json());

    await db.insert(beregamFaq).values({
      // Placeholder - nomoriUlang() di bawah segera menggantinya dengan
      // posisi yang benar. Diisi nilai sementara supaya kolom NOT NULL
      // terpenuhi; varchar(20) jadi harus pendek, tidak bisa pakai timestamp.
      menuKey: `_${Math.random().toString(36).slice(2, 10)}`,
      title: data.title,
      answer: data.answer,
      isActive: data.isActive,
      // Angka besar sembarang - hanya menjamin item baru berada di paling
      // akhir SEBELUM nomoriUlang() menghitung ulang seluruh urutan.
      sortOrder: 999,
    });

    await nomoriUlang();

    return NextResponse.json({ success: true, message: "Menu ditambahkan" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API Beregam Menu POST Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menambah menu" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib diisi" }, { status: 400 });
    }

    const data = menuSchema.parse(body);
    const statusSebelumnya = await db
      .select({ isActive: beregamFaq.isActive })
      .from(beregamFaq)
      .where(eq(beregamFaq.id, id))
      .limit(1);

    if (statusSebelumnya.length === 0) {
      return NextResponse.json({ success: false, message: "Menu tidak ditemukan" }, { status: 404 });
    }

    await db
      .update(beregamFaq)
      .set({ title: data.title, answer: data.answer, isActive: data.isActive })
      .where(eq(beregamFaq.id, id));

    // Hanya perlu dinomori ulang bila status aktifnya berubah - mengedit
    // judul/jawaban saja tidak menggeser urutan siapa pun.
    if (statusSebelumnya[0].isActive !== data.isActive) {
      await nomoriUlang();
    }

    return NextResponse.json({ success: true, message: "Menu diperbarui" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API Beregam Menu PUT Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui menu" }, { status: 500 });
  }
}

/** Menggeser urutan satu menu naik/turun satu posisi. */
export async function PATCH(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body?.id);
    const arah = body?.arah === "naik" ? "naik" : body?.arah === "turun" ? "turun" : null;

    if (!id || !arah) {
      return NextResponse.json(
        { success: false, message: "ID dan arah (naik/turun) wajib diisi" },
        { status: 400 }
      );
    }

    const semua = await db
      .select({ id: beregamFaq.id })
      .from(beregamFaq)
      .where(isNull(beregamFaq.parentKey))
      .orderBy(asc(beregamFaq.sortOrder), asc(beregamFaq.id));

    const posisi = semua.findIndex((b) => b.id === id);
    if (posisi === -1) {
      return NextResponse.json({ success: false, message: "Menu tidak ditemukan" }, { status: 404 });
    }

    const tukar = arah === "naik" ? posisi - 1 : posisi + 1;
    if (tukar < 0 || tukar >= semua.length) {
      // Sudah di ujung - bukan galat, cukup diamkan.
      return NextResponse.json({ success: true, message: "Sudah di posisi paling ujung" });
    }

    await db.update(beregamFaq).set({ sortOrder: tukar }).where(eq(beregamFaq.id, semua[posisi].id));
    await db.update(beregamFaq).set({ sortOrder: posisi }).where(eq(beregamFaq.id, semua[tukar].id));

    await nomoriUlang();

    return NextResponse.json({ success: true, message: "Urutan diperbarui" });
  } catch (error) {
    console.error("API Beregam Menu PATCH Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengubah urutan" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib diisi" }, { status: 400 });
    }

    const [baris] = await db.select({ answer: beregamFaq.answer }).from(beregamFaq).where(eq(beregamFaq.id, id)).limit(1);
    if (!baris) {
      return NextResponse.json({ success: false, message: "Menu tidak ditemukan" }, { status: 404 });
    }

    // "Bicara dengan petugas" adalah pintu keluar terakhir warga menuju
    // manusia. Menghapusnya lewat form yang sama dengan menu biasa terlalu
    // mudah tidak sengaja - kalau memang perlu dihapus, nonaktifkan saja
    // dulu untuk melihat efeknya, baru hapus lewat database langsung.
    if (baris.answer.trim() === "[ESKALASI]") {
      return NextResponse.json(
        {
          success: false,
          message:
            'Menu "Bicara dengan petugas" tidak bisa dihapus dari sini - ini jalur eskalasi ' +
            "utama warga menuju petugas. Nonaktifkan saja bila ingin menyembunyikannya sementara.",
        },
        { status: 400 }
      );
    }

    await db.delete(beregamFaq).where(eq(beregamFaq.id, id));
    await nomoriUlang();

    return NextResponse.json({ success: true, message: "Menu dihapus" });
  } catch (error) {
    console.error("API Beregam Menu DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus menu" }, { status: 500 });
  }
}
