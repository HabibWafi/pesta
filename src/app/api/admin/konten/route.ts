import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { faqs, siteSettings, testimonials } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth";
import {
  DEFINISI_SETTING,
  pengaturanBawaan,
  segarkanKonten,
  type KunciSetting,
} from "@/lib/content";

/**
 * Kelola konten landing dari admin.
 *
 * GET  - seluruh pengaturan, testimoni, dan FAQ (termasuk yang belum tayang)
 * PUT  - simpan pengaturan situs
 */

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [barisSetting, daftarTestimoni, daftarFaq] = await Promise.all([
      db.select().from(siteSettings),
      db.select().from(testimonials).orderBy(asc(testimonials.sortOrder), asc(testimonials.id)),
      db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.id)),
    ]);

    const pengaturan = pengaturanBawaan();
    for (const baris of barisSetting) {
      if (baris.key in pengaturan && baris.value !== null) {
        pengaturan[baris.key as KunciSetting] = baris.value;
      }
    }

    return NextResponse.json({
      success: true,
      pengaturan,
      definisi: DEFINISI_SETTING,
      testimoni: daftarTestimoni,
      faq: daftarFaq,
    });
  } catch (error) {
    console.error("API Admin Konten GET Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat konten" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const perubahan = body?.pengaturan as Record<string, string> | undefined;

    if (!perubahan || typeof perubahan !== "object") {
      return NextResponse.json(
        { success: false, message: "Tidak ada pengaturan yang dikirim" },
        { status: 400 }
      );
    }

    let tersimpan = 0;
    for (const [kunci, nilai] of Object.entries(perubahan)) {
      // Hanya kunci yang dikenal yang boleh masuk. Tanpa ini, siapa pun yang
      // bisa memanggil endpoint ini dapat menumpuk baris sembarangan.
      if (!(kunci in DEFINISI_SETTING)) continue;

      const def = DEFINISI_SETTING[kunci as KunciSetting];
      const teks = String(nilai ?? "");

      const [ada] = await db
        .select({ id: siteSettings.id })
        .from(siteSettings)
        .where(eq(siteSettings.key, kunci))
        .limit(1);

      if (ada) {
        await db
          .update(siteSettings)
          .set({ value: teks, updatedBy: session.id })
          .where(eq(siteSettings.id, ada.id));
      } else {
        await db.insert(siteSettings).values({
          key: kunci,
          value: teks,
          grup: def.grup,
          updatedBy: session.id,
        });
      }
      tersimpan += 1;
    }

    segarkanKonten();

    return NextResponse.json({
      success: true,
      message: `${tersimpan} pengaturan berhasil disimpan`,
    });
  } catch (error) {
    console.error("API Admin Konten PUT Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan pengaturan" },
      { status: 500 }
    );
  }
}
