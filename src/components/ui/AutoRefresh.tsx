"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  /** Refresh interval in milliseconds. Default: 30 000 (30 s). */
  interval?: number;
}

/**
 * Invisible client component — calls router.refresh() on a timer so server
 * components re-fetch their data without a full page reload.
 * Drop it anywhere inside an RSC tree; it renders nothing.
 */
export function AutoRefresh({ interval = 30_000 }: AutoRefreshProps) {
  const router = useRouter();
  // Keep a stable ref so we don't recreate the interval if the component re-renders
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => router.refresh(), interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router, interval]);

  return null;
}
