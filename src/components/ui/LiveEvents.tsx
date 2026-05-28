"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Invisible client component — opens one SSE connection to /api/events and
 * calls router.refresh() whenever the server broadcasts a "refresh" event.
 *
 * Drop it anywhere inside the authenticated layout; it renders nothing.
 * The browser's EventSource API handles reconnection automatically if the
 * connection drops.
 */
export function LiveEvents() {
  const router = useRouter();

  useEffect(() => {
    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/events");

      es.addEventListener("refresh", () => {
        router.refresh();
      });

      es.onerror = () => {
        // Close the errored connection and try again after 5 s.
        // The browser would retry on its own too, but this gives us control.
        es.close();
        reconnectTimer = setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [router]);

  return null;
}
