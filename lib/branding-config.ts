export type AppBranding = {
  appName: string;
  brandName: string;
  appLabel: string;
  companyName: string;
  appDescription: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  footerText: string;
  primaryColor: string;
  accentColor: string;
  headerColor: string;
  headerTextColor: string;
  titleColor: string;
  logoKey: string;
  logoUpdatedAt: string;
  logoUrl: string;
};

export const DEFAULT_BRANDING: AppBranding = {
  appName: "AINET Approval",
  brandName: "AINET",
  appLabel: "Approval",
  companyName: "PT Axindo Infinitas Network",
  appDescription: "Sistem persetujuan internal digital",
  heroTitle: "Pengajuan internal,",
  heroHighlight: "lebih ringkas dan tertib.",
  heroDescription: "Isi formulir, bubuhkan tanda tangan, dan kirim. Admin akan meneruskan pengajuan ke pejabat yang berwenang.",
  footerText: "Dokumen internal • Versi 1.3.1",
  primaryColor: "#087fc1",
  accentColor: "#15b8dd",
  headerColor: "#071b33",
  headerTextColor: "#ffffff",
  titleColor: "#0b172a",
  logoKey: "",
  logoUpdatedAt: "",
  logoUrl: "",
};
