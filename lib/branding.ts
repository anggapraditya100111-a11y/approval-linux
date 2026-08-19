import { ensureSchema, getD1 } from "@/db/runtime";
import { AppBranding, DEFAULT_BRANDING } from "@/lib/branding-config";
export type { AppBranding } from "@/lib/branding-config";
export { DEFAULT_BRANDING } from "@/lib/branding-config";

const editableKeys: Array<keyof AppBranding> = [
  "appName",
  "brandName",
  "appLabel",
  "companyName",
  "appDescription",
  "heroTitle",
  "heroHighlight",
  "heroDescription",
  "footerText",
  "primaryColor",
  "accentColor",
  "headerColor",
  "headerTextColor",
  "titleColor",
];

const colorKeys = new Set<keyof AppBranding>([
  "primaryColor",
  "accentColor",
  "headerColor",
  "headerTextColor",
  "titleColor",
]);

const maxLengths: Record<string, number> = {
  appName: 80,
  brandName: 30,
  appLabel: 30,
  companyName: 120,
  appDescription: 180,
  heroTitle: 100,
  heroHighlight: 100,
  heroDescription: 320,
  footerText: 120,
  primaryColor: 7,
  accentColor: 7,
  headerColor: 7,
  headerTextColor: 7,
  titleColor: 7,
};

export async function getBranding(): Promise<AppBranding> {
  await ensureSchema();
  const rows = await getD1().prepare("SELECT key, value FROM app_settings WHERE key LIKE 'branding.%'").all<{ key: string; value: string }>();
  const branding = { ...DEFAULT_BRANDING };
  for (const row of rows.results) {
    const key = row.key.slice("branding.".length) as keyof AppBranding;
    if (key in branding) branding[key] = row.value;
  }
  branding.logoUrl = branding.logoKey
    ? `/api/branding/logo?v=${encodeURIComponent(branding.logoUpdatedAt || "1")}`
    : "";
  return branding;
}

export async function saveBranding(input: Record<string, unknown>) {
  await ensureSchema();
  const now = new Date().toISOString();
  const statements = editableKeys.map((key) => {
    const fallback = DEFAULT_BRANDING[key];
    const candidate = String(input[key] ?? "").trim().slice(0, maxLengths[key] || 200);
    const value = colorKeys.has(key)
      ? (/^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : fallback)
      : candidate || fallback;
    return getD1().prepare(`INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
      .bind(`branding.${key}`, value, now);
  });
  await getD1().batch(statements);
  return getBranding();
}

export async function setBrandingLogo(enabled: boolean) {
  await ensureSchema();
  const now = new Date().toISOString();
  await getD1().batch([
    getD1().prepare(`INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
      .bind("branding.logoKey", enabled ? "branding/logo" : "", now),
    getD1().prepare(`INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
      .bind("branding.logoUpdatedAt", now, now),
  ]);
  return getBranding();
}
