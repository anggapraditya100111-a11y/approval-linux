import { NextResponse } from "next/server";
import { requireApiUser } from "@/app/app-auth";
import { writeAudit } from "@/db/runtime";
import { ACCESS_COOKIE_MAX_AGE, ACCESS_COOKIE_NAME, setAccessPassword } from "@/lib/access-gate";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Hanya Super Admin yang dapat mengganti password masuk aplikasi." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({})) as { password?: string; confirmation?: string };
  const password = String(body.password || "");
  if (!/^[A-Za-z0-9]{8,64}$/.test(password)) {
    return NextResponse.json({ error: "Password harus terdiri dari 8–64 huruf dan angka saja." }, { status: 400 });
  }
  if (password !== String(body.confirmation || "")) {
    return NextResponse.json({ error: "Konfirmasi password belum sama." }, { status: 400 });
  }
  const passwordHash = await setAccessPassword(password);
  await writeAudit({ actorEmail: user.email, actorName: user.name, action: "password_akses_aplikasi_diubah" });
  const response = NextResponse.json({ ok: true, message: "Password masuk aplikasi berhasil diganti." });
  response.cookies.set(ACCESS_COOKIE_NAME, passwordHash, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  return response;
}
