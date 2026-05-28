"use client";

import { useEffect } from "react";

/**
 * Invisible component — registers the service worker once on mount.
 * Must be in the client component tree (added to the root layout).
 * Safe to render on any page; registration is idempotent.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.debug("[SW] Registered:", reg.scope);
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err);
      });
  }, []);

  return null;
}
