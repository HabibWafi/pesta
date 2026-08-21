import { NextResponse } from "next/server";
import { getAdminTokenCookieName } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout berhasil.",
  });

  response.cookies.delete(getAdminTokenCookieName());
  return response;
}
