"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

function isIOSBrowser() {
  return (
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

function isStandalonePwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function supportsPushNotifications() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getServiceWorkerRegistration() {
  await navigator.serviceWorker.register("/sw.js");
  return await navigator.serviceWorker.ready;
}

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
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const updateState = (next: NotifState) => {
      window.setTimeout(() => {
        if (!cancelled) setState(next);
      }, 0);
    };

    // iOS Safari requires the app to be installed as a PWA (Add to Home Screen)
    const isIOS = isIOSBrowser();
    const isStandalone = isStandalonePwa();

    if (isIOS && !isStandalone) {
      updateState("ios-hint");
      return () => {
        cancelled = true;
      };
    }

    if (!supportsPushNotifications()) {
      updateState("unsupported");
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
    getServiceWorkerRegistration()
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          if (!cancelled) setState("unsubscribed");
          return;
        }
        // Confirm the server actually has this device/browser endpoint recorded.
        const params = new URLSearchParams({ endpoint: sub.endpoint });
        const res = await fetch(`/api/push/subscribe?${params.toString()}`, {
          cache: "no-store",
        });
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            if (data.subscribed) {
              setState("subscribed");
            } else {
              // Local sub exists but not in DB — re-sync it
              const json = sub.toJSON();
              if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
                const syncRes = await fetch("/api/push/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ subscription: json }),
                });
                if (syncRes.ok) {
                  setState("subscribed");
                } else {
                  await sub.unsubscribe();
                  setState("unsubscribed");
                }
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
    setErrorMessage("");
    try {
      if (!supportsPushNotifications()) {
        throw new Error("Push notifications require HTTPS and browser support.");
      }

      const permission = await Notification.requestPermission();
      if (permission === "denied") { setState("denied"); return; }
      if (permission !== "granted") { setState("unsubscribed"); return; }

      const reg = await getServiceWorkerRegistration();

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
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        });
      }

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        await sub.unsubscribe();
        throw new Error("Push subscription is missing endpoint or keys");
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: json }),
      });

      if (res.ok) {
        setState("subscribed");
      } else {
        const payload = await res.json().catch(() => ({ error: "Failed to save subscription" }));
        // Roll back the local PushManager subscription so the UI stays consistent.
        await sub.unsubscribe();
        throw new Error(String(payload.error ?? `Server rejected subscription (${res.status})`));
      }
    } catch (err) {
      console.error("[Push] subscribe error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Notification setup failed.");
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setErrorMessage("");
    try {
      const reg = await getServiceWorkerRegistration();
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
          Enable on iPhone
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

  // Completely unsupported or not running in a secure context.
  if (state === "unsupported") {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="text-muted-foreground/40 cursor-not-allowed"
        title="Push notifications require HTTPS and browser support"
      >
        <BellOff className="h-4 w-4" />
        Notifications unavailable
      </Button>
    );
  }

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
        Notifications blocked
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
        title={errorMessage || "Notification setup failed - tap to retry"}
        className="text-red-400 hover:text-red-300"
      >
        <BellOff className="h-4 w-4" />
        Retry notifications
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
