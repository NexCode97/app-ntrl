import { pool } from "../config/database.js";
import { addClient } from "../utils/sseManager.js";

// SSE stream — cliente se conecta y recibe eventos en tiempo real
export function stream(req, res) {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");

  const ok = addClient(req.user.id, req.user.role, res);
  if (!ok) return;

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 30000);
  req.on("close", () => clearInterval(heartbeat));
}

export async function list(req, res, next) {
  try {
    const { limit, offset } = req.pagination;
    const isAdmin = req.user.role === "admin";

    // Admins ven sus propias y las broadcast (user_id IS NULL)
    // Workers solo ven las suyas propias
    const whereClause = isAdmin
      ? "WHERE (user_id = $1 OR user_id IS NULL)"
      : "WHERE user_id = $1";

    const { rows } = await pool.query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      [req.user.id]
    );

    res.json({ status: "ok", data: rows, total: parseInt(count) });
  } catch (err) { next(err); }
}

export async function unreadCount(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";
    const whereClause = isAdmin
      ? "WHERE (user_id = $1 OR user_id IS NULL) AND is_read = false"
      : "WHERE user_id = $1 AND is_read = false";

    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      [req.user.id]
    );
    res.json({ status: "ok", count: parseInt(count) });
  } catch (err) { next(err); }
}

export async function markRead(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";
    if (isAdmin) {
      // Admins pueden marcar leídas las broadcast (user_id IS NULL) también
      await pool.query(
        "UPDATE notifications SET is_read = true WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)",
        [req.params.id, req.user.id]
      );
    } else {
      await pool.query(
        "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
        [req.params.id, req.user.id]
      );
    }
    res.json({ status: "ok" });
  } catch (err) { next(err); }
}

export async function markAllRead(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";
    const whereClause = isAdmin
      ? "WHERE (user_id = $1 OR user_id IS NULL) AND is_read = false"
      : "WHERE user_id = $1 AND is_read = false";

    await pool.query(
      `UPDATE notifications SET is_read = true ${whereClause}`,
      [req.user.id]
    );
    res.json({ status: "ok" });
  } catch (err) { next(err); }
}
