"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { AppBranding, DEFAULT_BRANDING } from "@/lib/branding-config";

type BrandingContextValue = {
  branding: AppBranding;
  setBranding: (branding: AppBranding) => void;
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  setBranding: () => undefined,
});

export function BrandingProvider({ initialBranding, children }: { initialBranding: AppBranding; children: ReactNode }) {
  const [branding, setBranding] = useState(initialBranding);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--blue", branding.primaryColor);
    root.style.setProperty("--cyan", branding.accentColor);
    root.style.setProperty("--navy", branding.headerColor);
    root.style.setProperty("--header-text", branding.headerTextColor);
    root.style.setProperty("--title-color", branding.titleColor);
  }, [branding]);
  return <BrandingContext.Provider value={{ branding, setBranding }}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
