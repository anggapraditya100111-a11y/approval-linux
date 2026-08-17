import { createHash, timingSafeEqual } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

export const ACCESS_COOKIE_NAME = "ainet_access";
export const ACCESS_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const dataDir = path.resolve(process.env.DATA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".data"));
const accessConfigPath = path.join(dataDir, "access-gate.json");

export function getAccessPassword() {
  return process.env.APP_ACCESS_PASSWORD || "";
}

export function accessCookieValue(password = getAccessPassword()) {
  return createHash("sha256")
    .update(`ainet-approval:access:v1:${password}`)
    .digest("hex");
}

export function getAccessPasswordHash() {
  try {
    const parsed = JSON.parse(readFileSync(accessConfigPath, "utf8")) as { passwordHash?: string };
    if (/^[a-f0-9]{64}$/.test(parsed.passwordHash || "")) return parsed.passwordHash || "";
  } catch {}
  const configured = getAccessPassword();
  return configured ? accessCookieValue(configured) : "";
}

export function verifyAccessPassword(candidate: string) {
  const configuredHash = getAccessPasswordHash();
  if (!configuredHash) return false;
  const actual = Buffer.from(accessCookieValue(candidate), "hex");
  const expected = Buffer.from(configuredHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function setAccessPassword(password: string) {
  const passwordHash = accessCookieValue(password);
  await mkdir(dataDir, { recursive: true });
  const temporaryPath = `${accessConfigPath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify({ passwordHash, updatedAt: new Date().toISOString() }), { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, accessConfigPath);
  return passwordHash;
}
