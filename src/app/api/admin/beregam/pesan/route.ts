import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { beregamSettings } from "@/lib/beregam/db/schema";
import { getAdminSession } from "@/lib/auth";
import { DEFINISI_PESAN, segarkanPesanBeregam, type DefinisiPesan, type KunciPesan } from "@/lib/beregam/pesan";

/**
 * Naskah pesan sistem bot Beregam (sapaan, tidak paham, eskalasi, dst).
 *
 * BEDA dari /api/admin/beregam/menu: itu mengelola MENU bernomor
 * (beregam_faq), ini mengelola naskah yang dikirim OTOMATIS oleh alur
 * percakapan (beregam_settings). Lihat src/lib/beregam/pesan.ts untuk
 * daftar kunci yang dikenal dan naskah bawaannya.
 */

const KUNCI_SAH = Object.keys(DEFINISI_PESAN) as KunciPesan[];

const pesanSchema = z.object({
  kunci: z.enum(KUNCI_SAH as [KunciPesan, ...KunciPesan[]]),
  nilai: z.string().trim().min(1, "Isi tidak boleh kosong"),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const tersimpan = await db.select().from(beregamSettings);
    const peta = Object.fromEntries(tersimpan.map((b) => [b.kunci, b.nilai]));

    const daftar = KUNCI_SAH.map((kunci) => ({
      kunci,
      label: DEFINISI_PESAN[kunci].label,
      bantuan: (DEFINISI_PESAN[kunci] as DefinisiPesan).bantuan ?? null,
      bawaan: DEFINISI_PESAN[kunci].bawaan,
      nilai: peta[kunci] ?? DEFINISI_PESAN[kunci].bawaan,
      // Petugas perlu tahu mana yang masih naskah bawaan vs sudah diubah -
      // supaya tidak bingung apakah perubahannya benar-benar tersimpan.
      sudahDiubah: kunci in peta,
    }));

    return NextResponse.json({ success: true, pesan: daftar });
  } catch (error) {
    console.error("API Beregam Pesan GET Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat naskah pesan" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = pesanSchema.parse(await req.json());

    const [ada] = await db
      .select({ id: beregamSettings.id })
      .from(beregamSettings)
      .where(eq(beregamSettings.kunci, data.kunci))
      .limit(1);

    if (ada) {
      await db.update(beregamSettings).set({ nilai: data.nilai }).where(eq(beregamSettings.id, ada.id));
    } else {
      await db.insert(beregamSettings).values({ kunci: data.kunci, nilai: data.nilai });
    }

    segarkanPesanBeregam();
    return NextResponse.json({ success: true, message: "Naskah disimpan" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API Beregam Pesan PUT Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan naskah" }, { status: 500 });
  }
}

/** Mengembalikan satu kunci ke naskah bawaan (menghapus baris di database). */
export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const kunci = new URL(req.url).searchParams.get("kunci");
    if (!kunci || !KUNCI_SAH.includes(kunci as KunciPesan)) {
      return NextResponse.json({ success: false, message: "Kunci tidak dikenal" }, { status: 400 });
    }

    await db.delete(beregamSettings).where(eq(beregamSettings.kunci, kunci));
    segarkanPesanBeregam();

    return NextResponse.json({ success: true, message: "Dikembalikan ke naskah bawaan" });
  } catch (error) {
    console.error("API Beregam Pesan DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal mengembalikan naskah" }, { status: 500 });
  }
}
