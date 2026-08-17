import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE_NAME = "ainet_access";
const PUBLIC_PATHS = new Set(["/akses-awal", "/api/access", "/health"]);

function accessCookieValue(password: string) {
  return createHash("sha256")
    .update(`ainet-approval:access:v1:${password}`)
    .digest("hex");
}

function matches(actual: string | undefined, expected: string) {
  if (!actual || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const configuredPassword = process.env.APP_ACCESS_PASSWORD || "";
  const expectedCookie = configuredPassword ? accessCookieValue(configuredPassword) : "";
  const hasAccess = Boolean(expectedCookie) && matches(
    request.cookies.get(ACCESS_COOKIE_NAME)?.value,
    expectedCookie,
  );

  if (hasAccess) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: configuredPassword ? "Password akses awal diperlukan." : "Password akses awal belum dikonfigurasi." },
      { status: configuredPassword ? 401 : 503 },
    );
  }

  const gateUrl = new URL("/akses-awal", request.url);
  gateUrl.searchParams.set("returnTo", `${pathname}${search}`);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|robots.txt).*)"],
};
