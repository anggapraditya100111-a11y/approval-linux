"use client";

import { useBranding } from "@/components/BrandingProvider";

export default function BrandLockup({ href, className = "brand" }: { href?: string; className?: string }) {
  const { branding } = useBranding();
  const content = <>
    <span className={`brand-mark ${branding.logoUrl ? "brand-mark-image" : ""}`}>
      {branding.logoUrl ? <img src={branding.logoUrl} alt={branding.appName} /> : branding.brandName.slice(0, 1).toUpperCase()}
    </span>
    <span><strong>{branding.brandName}</strong><small>{branding.appLabel}</small></span>
  </>;
  return href
    ? <a className={className} href={href} aria-label={branding.appName}>{content}</a>
    : <div className={className}>{content}</div>;
}
