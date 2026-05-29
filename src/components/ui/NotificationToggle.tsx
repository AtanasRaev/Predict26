"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Convert VAPID base64url string to Uint8Array for PushManager.subscribe().
 *  Must return Uint8Array (not plain ArrayBuffer) — iOS Safari rejects ArrayBuffer with AbortError. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

type NotifState =
  | "loading"       // Checking current state
  | "unsupported"   // Browser doesn't support push
  | "ios-hint"      // iOS Safari — needs "Add to Home Screen" first
  | "denied"        // User previously blocked notifications
  | "subscribed"    // Active subscription in DB
  | "unsubscribed"  // Supported + permitted, but not subscribed
  | "error";        // Subscription attempt failed

export function NotificationToggle() {
  const [state, setState] = useState<NotifState>("loading");
  const [busy, setBusy] = useState(false);
  const [tooltip, setTooltip] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const updateState = (next: NotifState) => {
      window.setTimeout(() => {
        if (!cancelled) setState(next);
      }, 0);
    };

    // iOS Safari requires the app to be installed as a PWA (Add to Home Screen)
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      updateState(isIOS && !isStandalone ? "ios-hint" : "unsupported");
      return () => {
        cancelled = true;
      };
    }

    if (Notification.permission === "denied") {
      updateState("denied");
      return () => {
        cancelled = true;
      };
    }

    // Verify subscription state against both PushManager AND the server.
    // PushManager alone can show a local subscription that was never saved to the DB.
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          if (!cancelled) setState("unsubscribed");
          return;
        }
        // Confirm the server actually has this subscription recorded
        const res = await fetch("/api/push/subscribe");
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            if (data.subscribed) {
              setState("subscribed");
            } else {
              // Local sub exists but not in DB — re-sync it
              const json = sub.toJSON();
              if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
                await fetch("/api/push/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    endpoint: json.endpoint,
                    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
                  }),
                });
                setState("subscribed");
              } else {
                await sub.unsubscribe();
                setState("unsubscribed");
              }
            }
          } else {
            setState("unsubscribed");
          }
        }
      })
      .catch(() => {
        if (!cancelled) setState("unsubscribed");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") { setState("denied"); return; }
      if (permission !== "granted") { setState("unsubscribed"); return; }

      const reg = await navigator.serviceWorker.ready;

      // Fetch VAPID key from server — avoids iOS PWA cached-bundle issues with process.env
      const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
      if (!keyRes.ok) throw new Error("Failed to get VAPID public key");
      const { publicKey } = await keyRes.json() as { publicKey: string };

      // Reuse existing subscription if present; create new one otherwise
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Must be Uint8Array — iOS Safari rejects plain ArrayBuffer with AbortError
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });

      if (res.ok) {
        setState("subscribed");
      } else {
        // Roll back the local PushManager subscription so the UI stays consistent.
        await sub.unsubscribe();
        throw new Error(`Server rejected subscription (${res.status})`);
      }
    } catch (err) {
      console.error("[Push] subscribe error:", err);
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } catch (err) {
      console.error("[Push] unsubscribe error:", err);
    } finally {
      setBusy(false);
    }
  };

  // Don't show anything while loading
  if (state === "loading") return null;

  // iOS not installed as PWA
  if (state === "ios-hint") {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTooltip((v) => !v)}
          className="text-muted-foreground"
          title="Push notifications require iOS Home Screen install"
        >
          <Bell className="h-4 w-4" />
        </Button>
        {tooltip && (
          <div className="absolute right-0 top-9 z-50 w-64 rounded-lg border bg-card p-3 text-xs shadow-lg">
            <p className="font-semibold mb-1">📱 Enable on iPhone</p>
            <p className="text-muted-foreground">
              Tap <strong>Share → Add to Home Screen</strong> in Safari, then open
              the app from your Home Screen to enable push notifications.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Completely unsupported (desktop non-Chrome, etc.)
  if (state === "unsupported") return null;

  // Blocked by the user
  if (state === "denied") {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="text-muted-foreground/40 cursor-not-allowed"
        title="Notifications blocked — enable them in browser settings"
      >
        <BellOff className="h-4 w-4" />
      </Button>
    );
  }

  // Subscription failed — clicking retries
  if (state === "error") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={subscribe}
        disabled={busy}
        title="Notification setup failed — tap to retry"
        className="text-red-400 hover:text-red-300"
      >
        <BellOff className="h-4 w-4" />
      </Button>
    );
  }

  // Subscribed — clicking turns off
  if (state === "subscribed") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={unsubscribe}
        disabled={busy}
        className="text-yellow-400 hover:text-yellow-300"
      >
        <BellRing className="h-4 w-4" />
        Notifications on
      </Button>
    );
  }

  // Unsubscribed — clicking turns on
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={subscribe}
      disabled={busy}
      className="text-muted-foreground hover:text-foreground"
    >
      <Bell className="h-4 w-4" />
      Notify me
    </Button>
  );
}
