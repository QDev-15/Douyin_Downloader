/**
 * All ad IDs are optional and read from env vars. Until they're set,
 * <AdSlot> renders a labeled placeholder box instead - so the layout is
 * already ad-ready and nothing breaks in dev/before an ad account exists.
 * Fill these in .env.local once a Google AdSense (or other network) account
 * and ad units exist - no component code needs to change.
 */
export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "";

export const AD_SLOTS = {
  headerBanner: process.env.NEXT_PUBLIC_AD_SLOT_HEADER ?? "",
  inContent: process.env.NEXT_PUBLIC_AD_SLOT_IN_CONTENT ?? "",
  sidebarLeft: process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR_LEFT ?? "",
  sidebarRight: process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR_RIGHT ?? "",
  footer: process.env.NEXT_PUBLIC_AD_SLOT_FOOTER ?? "",
} as const;

export type AdPlacement = keyof typeof AD_SLOTS;

export function isAdNetworkConfigured(): boolean {
  return Boolean(ADSENSE_CLIENT_ID);
}
