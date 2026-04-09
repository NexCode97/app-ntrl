/**
 * Limpia todos los cachés del service worker y recarga la página.
 * Equivalente a Ctrl+Shift+R en el navegador.
 */
export async function hardRefresh() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.update()));
  }
  window.location.reload();
}
