import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AINET Approval",
  description: "Sistem persetujuan internal digital PT Axindo Infinitas Network.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
