import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

// Precaching de assets (inyectado por Vite PWA)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache de API de lectura
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/catalog") || url.pathname.startsWith("/api/customers"),
  new NetworkFirst({ cacheName: "api-read" })
);

// ── Push Notifications ────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "NTRL", {
      body:    data.body ?? "",
      icon:    "/icons/icon-192.png",
      badge:   "/icons/icon-192.png",
      data:    { url: data.url ?? "/" },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin) && "focus" in c);
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
