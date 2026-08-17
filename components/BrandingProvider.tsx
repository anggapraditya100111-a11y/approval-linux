"use client";

import { createContext, ReactNode, useContext, useState } from "react";
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
  return <BrandingContext.Provider value={{ branding, setBranding }}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
