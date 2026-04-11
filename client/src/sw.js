// VitePWA reemplaza self.__WB_MANIFEST con la lista de assets al hacer build
// Usamos push() para evitar que Rollup elimine la referencia por tree-shaking
(self.__WB_MANIFEST || []).forEach(() => {});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Notificacion", body: event.data.text() }; }

  const { title = "Natural", body = "", url = "/" } = data;
  const base = self.location.origin;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: `${base}/icons/icon-192.png`,
      badge: `${base}/icons/icon-192.png`,
      vibrate: [200, 100, 200],
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
