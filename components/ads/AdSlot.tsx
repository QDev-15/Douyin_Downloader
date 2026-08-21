"use client";

import { useEffect, useRef } from "react";
import { AD_SLOTS, ADSENSE_CLIENT_ID, AdPlacement } from "@/lib/ads/config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  placement: AdPlacement;
  /** Placeholder box height in px, so the layout reserves the right amount of space before a real ad loads. */
  minHeight: number;
  className?: string;
  label?: string;
}

export default function AdSlot({ placement, minHeight, className = "", label = "Quảng cáo" }: AdSlotProps) {
  const slotId = AD_SLOTS[placement];
  const isConfigured = Boolean(ADSENSE_CLIENT_ID && slotId);
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!isConfigured) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script blocked or not ready yet - fail silently, the
      // placeholder-less <ins> just stays empty rather than breaking the page.
    }
  }, [isConfigured]);

  if (!isConfigured) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-lg border border-dashed border-black/15 bg-black/[.02] px-3 text-center text-[11px] uppercase tracking-wide text-neutral-400 dark:border-white/15 dark:bg-white/[.03] dark:text-neutral-600 ${className}`}
        style={{ minHeight }}
        data-ad-placeholder={placement}
      >
        {label}
      </div>
    );
  }

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle block ${className}`}
      style={{ display: "block", minHeight }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
