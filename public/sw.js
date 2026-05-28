// Predict26 Service Worker
// Handles Web Push notifications and basic PWA lifecycle.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// --- Push handler ---
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Predict26", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Predict26", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      data: { url: data.url ?? "/fixtures" },
      tag: "predict26-reminder", // replaces a previous notification for the same match
      requireInteraction: false,
    })
  );
});

// --- Notification click: open (or focus) the app ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/fixtures";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an already-open tab if possible
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new tab
        return self.clients.openWindow(targetUrl);
      })
  );
});
