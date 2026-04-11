import webpush from "web-push";
import { pool } from "../config/database.js";

webpush.setVapidDetails(
  "mailto:admin@ntrl.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendToSubs(rows, payload) {
  const results = await Promise.allSettled(rows.map((sub) =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
  ));
  // Eliminar suscripciones que ya no son validas (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected" && r.reason?.statusCode === 410) {
      pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [rows[i].endpoint]).catch(() => {});
    } else if (r.status === "rejected") {
      console.error("[push] sendNotification error:", r.reason?.message ?? r.reason);
    }
  }
}

export async function pushToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const { rows } = await pool.query(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
      [userId]
    );
    if (rows.length) await sendToSubs(rows, payload);
  } catch (err) { console.error("[push] pushToUser error:", err.message); }
}

export async function pushToRoles(roles, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const { rows } = await pool.query(
      `SELECT ps.endpoint, ps.p256dh, ps.auth
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.role = ANY($1) AND u.is_active = true`,
      [roles]
    );
    if (rows.length) await sendToSubs(rows, payload);
  } catch (err) { console.error("[push] pushToRoles error:", err.message); }
}

export async function pushToWorkers(payload) {
  return pushToRoles(["worker"], payload);
}
