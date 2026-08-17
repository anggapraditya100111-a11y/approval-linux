import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_COOKIE_NAME,
  accessCookieValue,
  getAccessPassword,
  verifyAccessPassword,
} from "@/lib/access-gate";

export async function POST(request: Request) {
  const configuredPassword = getAccessPassword();
  if (!configuredPassword) {
    return NextResponse.json(
      { error: "Password akses awal belum dikonfigurasi oleh administrator." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({})) as { password?: string };
  if (!verifyAccessPassword(String(body.password || ""))) {
    return NextResponse.json({ error: "Password akses tidak sesuai." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE_NAME, accessCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  return response;
}
