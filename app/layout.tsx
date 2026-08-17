import type { Metadata } from "next";
import { BrandingProvider } from "@/components/BrandingProvider";
import { DEFAULT_BRANDING, getBranding } from "@/lib/branding";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  return {
    title: branding.appName,
    description: `${branding.appDescription} ${branding.companyName}.`,
    other: { "codex-preview": "development" },
    icons: { icon: branding.logoUrl || "/favicon.svg", shortcut: branding.logoUrl || "/favicon.svg" },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  return (
    <html lang="id">
      <body><BrandingProvider initialBranding={branding}>{children}</BrandingProvider></body>
    </html>
  );
}
