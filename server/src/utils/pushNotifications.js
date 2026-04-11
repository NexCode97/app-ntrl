import webpush from "web-push";
import { pool } from "../config/database.js";

webpush.setVapidDetails(
  "mailto:admin@ntrl.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function pushToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const { rows } = await pool.query(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
      [userId]
    );
    await Promise.allSettled(rows.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    ));
  } catch { }
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
    await Promise.allSettled(rows.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    ));
  } catch { }
}

export async function pushToWorkers(payload) {
  return pushToRoles(["worker"], payload);
}
