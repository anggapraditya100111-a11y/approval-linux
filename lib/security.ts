import bcrypt from "bcryptjs";

export async function hashSecret(secret: string, scope: string) {
  const bytes = new TextEncoder().encode(`ainet-approval:v2:${scope}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function maskName(name: string) {
  return name.trim().split(/\s+/).map((part) => part.length <= 2 ? `${part[0] || ""}*` : `${part.slice(0, 3)}${"*".repeat(Math.min(5, part.length - 3))}`).join(" ");
}
