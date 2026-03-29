import { pool } from "../config/database.js";
import { redis } from "../config/redis.js";

const CACHE_TTL = 300; // 5 minutos

async function cached(key, fn) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const data = await fn();
  await redis.setex(key, CACHE_TTL, JSON.stringify(data));
  return data;
}

export async function getSummary(req, res, next) {
  try {
    const data = await cached("dashboard:summary", async () => {
      const [byStatus, monthly, bySport, byLine, financial, workerPerf] = await Promise.all([
        // Total pedidos por estado
        pool.query(`SELECT status, COUNT(*) as total FROM orders GROUP BY status`),

        // Ventas mensuales (últimos 12 meses)
        pool.query(`
          SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
                 COUNT(*) as orders, SUM(total) as revenue
          FROM orders
          WHERE created_at >= NOW() - INTERVAL '12 months'
          GROUP BY month ORDER BY month`),

        // Ventas por deporte
        pool.query(`
          SELECT s.name as sport, COUNT(DISTINCT o.id) as orders, SUM(oi.subtotal) as revenue
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN lines l ON l.id = p.line_id
          JOIN sports s ON s.id = l.sport_id
          JOIN orders o ON o.id = oi.order_id
          GROUP BY s.name ORDER BY revenue DESC`),

        // Ventas por línea (top 10)
        pool.query(`
          SELECT l.name as line, s.name as sport, COUNT(DISTINCT o.id) as orders, SUM(oi.subtotal) as revenue
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN lines l ON l.id = p.line_id
          JOIN sports s ON s.id = l.sport_id
          JOIN orders o ON o.id = oi.order_id
          GROUP BY l.name, s.name ORDER BY revenue DESC LIMIT 10`),

        // Financiero global
        pool.query(`
          SELECT SUM(total) as total_revenue, SUM(amount_paid) as collected, SUM(balance) as pending
          FROM orders WHERE status != 'delivered' OR status = 'delivered'`),

        // Rendimiento por trabajador
        pool.query(`
          SELECT u.name, u.area, COUNT(*) FILTER (WHERE pt.status = 'done') as completed,
                 COUNT(*) FILTER (WHERE pt.status = 'in_progress') as in_progress
          FROM production_tasks pt
          JOIN users u ON u.id = pt.completed_by OR u.id = pt.started_by
          WHERE u.role = 'worker'
          GROUP BY u.id, u.name, u.area ORDER BY completed DESC`),
      ]);

      return {
        byStatus:    byStatus.rows,
        monthly:     monthly.rows,
        bySport:     bySport.rows,
        byLine:      byLine.rows,
        financial:   financial.rows[0],
        workerPerf:  workerPerf.rows,
      };
    });

    res.json({ status: "ok", data });
  } catch (err) { next(err); }
}

export async function invalidateCache(req, res) {
  await redis.del("dashboard:summary");
  res.json({ status: "ok", message: "Caché invalidada." });
}

export async function getUpcomingDeliveries(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.order_number, TO_CHAR(o.order_number,'FM000') AS order_number_fmt,
              o.delivery_date, o.status, c.name AS customer_name
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.status NOT IN ('delivered','cancelled')
         AND o.delivery_date IS NOT NULL
       ORDER BY o.delivery_date ASC
       LIMIT 5`
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}
