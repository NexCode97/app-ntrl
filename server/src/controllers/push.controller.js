import { pool } from "../config/database.js";

export async function getVapidKey(req, res) {
  res.json({ status: "ok", publicKey: process.env.VAPID_PUBLIC_KEY ?? "" });
}

export async function subscribe(req, res, next) {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ status: "error", message: "Suscripcion invalida." });
    }
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ status: "ok" });
  } catch (err) { next(err); }
}

export async function unsubscribe(req, res, next) {
  try {
    const { endpoint } = req.body;
    await pool.query(
      "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
      [req.user.id, endpoint]
    );
    res.json({ status: "ok" });
  } catch (err) { next(err); }
}
