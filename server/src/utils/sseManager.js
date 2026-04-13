/**
 * SSE Manager — Notificaciones en tiempo real
 * Usa Redis Pub/Sub para escalar entre instancias.
 * Máximo 50 conexiones simultáneas.
 */

import { redisSub, redisPub } from "../config/redis.js";
import { pool } from "../config/database.js";

const MAX_CONNECTIONS = 50;

// userId -> Set<{ res, role }>
const clients = new Map();

export function initSSESubscriber() {
  redisSub.subscribe("ntrl:notifications", (err) => {
    if (err) console.error("SSE Redis subscribe error:", err);
  });

  redisSub.on("message", (channel, raw) => {
    if (channel !== "ntrl:notifications") return;
    try {
      const msg = JSON.parse(raw);
      _deliver(msg);
    } catch { /* ignorar mensajes malformados */ }
  });
}

export function addClient(userId, role, res) {
  const total = [...clients.values()].reduce((sum, s) => sum + s.size, 0);
  if (total >= MAX_CONNECTIONS) {
    res.status(503).json({ error: "Capacidad SSE máxima alcanzada." });
    return false;
  }

  if (!clients.has(userId)) clients.set(userId, new Set());
  const entry = { res, role };
  clients.get(userId).add(entry);

  res.on("close", () => {
    clients.get(userId)?.delete(entry);
    if (clients.get(userId)?.size === 0) clients.delete(userId);
  });

  return true;
}

// Entrega interna: respeta targetRole si está definido
function _deliver(msg) {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const [, entrySet] of clients) {
    for (const { res, role } of entrySet) {
      if (!msg.targetRole || msg.targetRole === role) {
        res.write(data);
      }
    }
  }
}

export function sendToUser(userId, msg) {
  const entrySet = clients.get(userId);
  if (!entrySet) return;
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const { res } of entrySet) res.write(data);
}

// Guardar notificación admin en BD y enviar SSE solo a admins
export async function notifyAdmins(type, message, data = {}) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, message, data) VALUES (NULL, $1, $2, $3)`,
    [type, message, JSON.stringify(data)]
  );
  await redisPub.publish("ntrl:notifications", JSON.stringify({
    targetRole: "admin",
    type,
    message,
    data,
  }));
}

// Broadcast de invalidación de cache a todos los clientes conectados
export function broadcastInvalidate(...queryKeys) {
  redisPub.publish("ntrl:notifications", JSON.stringify({
    type: "invalidate",
    queryKeys,
  })).catch(() => {});
}

// Notificación para un usuario específico
export async function notify(userId, type, message, data = {}) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, message, data) VALUES ($1, $2, $3, $4)`,
    [userId || null, type, message, JSON.stringify(data)]
  );
  await redisPub.publish("ntrl:notifications", JSON.stringify({ userId, type, message, data }));
}
