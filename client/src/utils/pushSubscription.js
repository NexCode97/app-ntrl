import { api } from "../config/api.js";

async function getVapidKey() {
  const { data } = await api.get("/push/vapid-key");
  return data.publicKey;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Espera a que el SW esté listo con timeout de 10s
function swReady() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("SW timeout")), 10000)
    ),
  ]);
}

export async function subscribeToPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[push] No soportado en este navegador");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[push] Permiso denegado:", permission);
      return;
    }

    const registration = await swReady();
    console.log("[push] SW listo:", registration.active?.scriptURL);

    const publicKey = await getVapidKey();
    if (!publicKey) {
      console.warn("[push] Sin VAPID key");
      return;
    }

    // Verificar si ya hay suscripción activa
    const existing = await registration.pushManager.getSubscription();
    let subscription = existing;

    if (!existing) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      console.log("[push] Nueva suscripcion creada");
    } else {
      console.log("[push] Suscripcion ya existente, renovando en BD");
    }

    await api.post("/push/subscribe", subscription.toJSON());
    console.log("[push] Suscripcion guardada en servidor");
  } catch (err) {
    console.error("[push] Error al suscribir:", err.message);
  }
}

export async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await swReady();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await api.post("/push/unsubscribe", { endpoint: subscription.endpoint }).catch(() => {});
    await subscription.unsubscribe();
  } catch (err) {
    console.error("[push] Error al desuscribir:", err.message);
  }
}
