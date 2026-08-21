import { NextResponse } from "next/server";
import { asc, eq, ne, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ROLE, requireRole, type AdminPayload } from "@/lib/auth";
import * as z from "zod";

export const dynamic = "force-dynamic";

/**
 * Kelola akun administrator. Khusus SUPERADMIN.
 *
 * Tiga pengaman yang tidak boleh dilepas - ketiganya mencegah instansi
 * kehilangan akses ke panelnya sendiri:
 *   1. Tidak bisa menghapus akun sendiri
 *   2. Tidak bisa menurunkan peran akun sendiri
 *   3. Tidak boleh sampai tidak ada SUPERADMIN tersisa
 */

const buatSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(255),
  email: z.string().trim().email("Format email tidak valid").max(255),
  password: z.string().min(8, "Password minimal 8 karakter").max(200),
  role: z.enum([ROLE.ADMIN, ROLE.SUPERADMIN]),
});

const ubahSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(255),
  email: z.string().trim().email("Format email tidak valid").max(255),
  role: z.enum([ROLE.ADMIN, ROLE.SUPERADMIN]),
  /** Kosong berarti password tidak diubah. */
  password: z.string().max(200).optional().or(z.literal("")),
});

/** Menolak dengan pesan yang tepat: belum login vs tidak berwenang. */
function tolak(sesi: AdminPayload | null) {
  if (!sesi) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    {
      success: false,
      message: "Hanya SUPERADMIN yang boleh mengelola akun administrator.",
    },
    { status: 403 }
  );
}

/** Jumlah SUPERADMIN selain id tertentu. */
async function jumlahSuperadminLain(kecualiId: number): Promise<number> {
  const baris = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, ROLE.SUPERADMIN), ne(users.id, kecualiId)));
  return baris.length;
}

export async function GET() {
  const { sesi, berwenang } = await requireRole(ROLE.SUPERADMIN);
  if (!berwenang) return tolak(sesi);

  try {
    // Kolom password sengaja TIDAK ikut dipilih. Hash tidak punya alasan
    // untuk pernah meninggalkan server.
    const daftar = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(asc(users.id));

    return NextResponse.json({ success: true, items: daftar, sayaId: sesi!.id });
  } catch (error) {
    console.error("API Admin Users GET Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat daftar akun" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { sesi, berwenang } = await requireRole(ROLE.SUPERADMIN);
  if (!berwenang) return tolak(sesi);

  try {
    const data = buatSchema.parse(await req.json());

    const [kembar] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);
    if (kembar) {
      return NextResponse.json(
        { success: false, message: "Email itu sudah dipakai akun lain." },
        { status: 409 }
      );
    }

    await db.insert(users).values({
      name: data.name,
      email: data.email,
      password: await bcrypt.hash(data.password, 10),
      role: data.role,
    });

    return NextResponse.json(
      { success: true, message: `Akun ${data.name} berhasil dibuat` },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API Admin Users POST Error:", error);
    return NextResponse.json({ success: false, message: "Gagal membuat akun" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { sesi, berwenang } = await requireRole(ROLE.SUPERADMIN);
  if (!berwenang) return tolak(sesi);

  try {
    const data = ubahSchema.parse(await req.json());

    const [target] = await db.select().from(users).where(eq(users.id, data.id)).limit(1);
    if (!target) {
      return NextResponse.json({ success: false, message: "Akun tidak ditemukan" }, { status: 404 });
    }

    // Pengaman 2: jangan sampai menurunkan peran diri sendiri lalu terkunci
    // di luar halaman ini.
    if (data.id === sesi!.id && data.role !== ROLE.SUPERADMIN) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Anda tidak bisa menurunkan peran akun sendiri. Minta SUPERADMIN lain yang melakukannya.",
        },
        { status: 400 }
      );
    }

    // Pengaman 3: selalu sisakan minimal satu SUPERADMIN.
    if (target.role === ROLE.SUPERADMIN && data.role !== ROLE.SUPERADMIN) {
      if ((await jumlahSuperadminLain(target.id)) === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Ini satu-satunya SUPERADMIN. Angkat SUPERADMIN lain dulu sebelum menurunkan yang ini.",
          },
          { status: 400 }
        );
      }
    }

    const [kembar] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.email), ne(users.id, data.id)))
      .limit(1);
    if (kembar) {
      return NextResponse.json(
        { success: false, message: "Email itu sudah dipakai akun lain." },
        { status: 409 }
      );
    }

    const perubahan: Record<string, string> = {
      name: data.name,
      email: data.email,
      role: data.role,
    };
    if (data.password) {
      if (data.password.length < 8) {
        return NextResponse.json(
          { success: false, message: "Password baru minimal 8 karakter." },
          { status: 400 }
        );
      }
      perubahan.password = await bcrypt.hash(data.password, 10);
    }

    await db.update(users).set(perubahan).where(eq(users.id, data.id));

    return NextResponse.json({
      success: true,
      message: data.password
        ? `Akun ${data.name} diperbarui, password diganti`
        : `Akun ${data.name} diperbarui`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("API Admin Users PUT Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui akun" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { sesi, berwenang } = await requireRole(ROLE.SUPERADMIN);
  if (!berwenang) return tolak(sesi);

  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib diisi" }, { status: 400 });
    }

    // Pengaman 1: tidak bisa menghapus akun sendiri.
    if (id === sesi!.id) {
      return NextResponse.json(
        { success: false, message: "Anda tidak bisa menghapus akun sendiri." },
        { status: 400 }
      );
    }

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) {
      return NextResponse.json({ success: false, message: "Akun tidak ditemukan" }, { status: 404 });
    }

    if (target.role === ROLE.SUPERADMIN && (await jumlahSuperadminLain(id)) === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Ini satu-satunya SUPERADMIN. Menghapusnya akan mengunci semua orang di luar panel.",
        },
        { status: 400 }
      );
    }

    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true, message: `Akun ${target.name} dihapus` });
  } catch (error) {
    console.error("API Admin Users DELETE Error:", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus akun" }, { status: 500 });
  }
}
