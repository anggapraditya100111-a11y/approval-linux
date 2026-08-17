import { createHash, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE_NAME = "ainet_access";
export const ACCESS_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export function getAccessPassword() {
  return process.env.APP_ACCESS_PASSWORD || "";
}

export function accessCookieValue(password = getAccessPassword()) {
  return createHash("sha256")
    .update(`ainet-approval:access:v1:${password}`)
    .digest("hex");
}

export function verifyAccessPassword(candidate: string) {
  const configured = getAccessPassword();
  if (!configured) return false;
  const actual = Buffer.from(accessCookieValue(candidate), "hex");
  const expected = Buffer.from(accessCookieValue(configured), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
