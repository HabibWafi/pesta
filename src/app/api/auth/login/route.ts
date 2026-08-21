import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { signAdminToken, getAdminTokenCookieName } from "@/lib/auth";
import { catatGagal, kunciLimit, periksaLimit, resetLimit } from "@/lib/rate-limit";
import { bacaIp } from "@/lib/analytics";
import * as z from "zod";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(1, "Password harus diisi"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // IP hanya dipakai sebagai kunci pembatas di memori, tidak disimpan.
    const kunci = kunciLimit(bacaIp(req.headers), email);

    const limit = periksaLimit(kunci);
    if (!limit.boleh) {
      const menit = Math.ceil(limit.tungguDetik / 60);
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak percobaan login yang gagal. Coba lagi dalam ${menit} menit.`,
        },
        { status: 429 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Pesan gagal disengaja sama untuk "email tidak terdaftar" dan
    // "password salah". Membedakannya akan memberi tahu penyerang email
    // mana yang ada di sistem.
    const cocok = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !cocok) {
      const setelah = catatGagal(kunci);
      const sisa =
        setelah.sisaPercobaan > 0
          ? ` Sisa ${setelah.sisaPercobaan} percobaan sebelum dikunci sementara.`
          : "";
      return NextResponse.json(
        { success: false, message: `Kombinasi Email atau Password salah.${sisa}` },
        { status: 401 }
      );
    }

    resetLimit(kunci);

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const response = NextResponse.json({
      success: true,
      message: "Login Admin Berhasil",
      user: payload,
    });

    response.cookies.set({
      name: getAdminTokenCookieName(),
      value: signAdminToken(payload),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 hari
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }

    console.error("API Auth Login Error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server saat login admin." },
      { status: 500 }
    );
  }
}
