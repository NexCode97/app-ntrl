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

// Guarda snapshot del mes indicado (formato 'YYYY-MM') si aún no existe
async function saveSnapshotIfMissing(month) {
  const existing = await pool.query(
    `SELECT id FROM monthly_snapshots WHERE month = $1`,
    [month]
  );
  if (existing.rowCount > 0) return;

  const [financial, byStatus] = await Promise.all([
    pool.query(`
      SELECT
        COALESCE(SUM(total), 0)       AS total_revenue,
        COALESCE(SUM(amount_paid), 0) AS collected,
        COALESCE(SUM(balance), 0)     AS pending,
        COUNT(*)                      AS orders_count
      FROM orders
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::date)
    `, [`${month}-01`]),
    pool.query(`
      SELECT status, COUNT(*) AS total
      FROM orders
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::date)
      GROUP BY status
    `, [`${month}-01`]),
  ]);

  const statusCounts = {};
  byStatus.rows.forEach((r) => { statusCounts[r.status] = Number(r.total); });
  const f = financial.rows[0];

  await pool.query(
    `INSERT INTO monthly_snapshots (month, total_revenue, collected, pending, orders_count, status_counts)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (month) DO NOTHING`,
    [month, f.total_revenue, f.collected, f.pending, f.orders_count, JSON.stringify(statusCounts)]
  );
}

// Devuelve 'YYYY-MM' del mes anterior al actual
function previousMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getSummary(req, res, next) {
  try {
    // Guardar snapshot del mes anterior en background (sin bloquear respuesta)
    saveSnapshotIfMissing(previousMonth()).catch(() => {});

    const data = await cached("dashboard:summary", async () => {
      const [byStatus, monthly, bySport, byLine, financial, workerPerf] = await Promise.all([
        // Solo pedidos del mes actual
        pool.query(`
          SELECT status, COUNT(*) AS total
          FROM orders
          WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
          GROUP BY status
        `),

        pool.query(`
          SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
                 COUNT(*) AS orders, SUM(total) AS revenue
          FROM orders
          WHERE created_at >= NOW() - INTERVAL '12 months'
          GROUP BY month ORDER BY month
        `),

        pool.query(`
          SELECT s.name AS sport, COUNT(DISTINCT o.id) AS orders, SUM(oi.subtotal) AS revenue
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN lines l ON l.id = p.line_id
          JOIN sports s ON s.id = l.sport_id
          JOIN orders o ON o.id = oi.order_id
          GROUP BY s.name ORDER BY revenue DESC
        `),

        pool.query(`
          SELECT l.name AS line, s.name AS sport, COUNT(DISTINCT o.id) AS orders, SUM(oi.subtotal) AS revenue
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN lines l ON l.id = p.line_id
          JOIN sports s ON s.id = l.sport_id
          JOIN orders o ON o.id = oi.order_id
          GROUP BY l.name, s.name ORDER BY revenue DESC LIMIT 10
        `),

        // Solo pedidos del mes actual
        pool.query(`
          SELECT
            COALESCE(SUM(total), 0)       AS total_revenue,
            COALESCE(SUM(amount_paid), 0) AS collected,
            COALESCE(SUM(balance), 0)     AS pending
          FROM orders
          WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        `),

        pool.query(`
          SELECT u.name, u.area,
                 COUNT(*) FILTER (WHERE pt.status = 'done')        AS completed,
                 COUNT(*) FILTER (WHERE pt.status = 'in_progress') AS in_progress
          FROM production_tasks pt
          JOIN users u ON u.id = pt.completed_by OR u.id = pt.started_by
          WHERE u.role = 'worker'
          GROUP BY u.id, u.name, u.area ORDER BY completed DESC
        `),
      ]);

      return {
        byStatus:   byStatus.rows,
        monthly:    monthly.rows,
        bySport:    bySport.rows,
        byLine:     byLine.rows,
        financial:  financial.rows[0],
        workerPerf: workerPerf.rows,
      };
    });

    res.json({ status: "ok", data });
  } catch (err) { next(err); }
}

export async function invalidateCache(req, res) {
  await redis.del("dashboard:summary");
  res.json({ status: "ok", message: "Caché invalidada." });
}

export async function getMonthlyHistory(req, res, next) {
  try {
    // Calcular directamente desde orders — no depende de monthly_snapshots
    const { rows } = await pool.query(`
      SELECT
        f.month,
        f.total_revenue,
        f.collected,
        f.pending,
        f.orders_count,
        s.status_counts
      FROM (
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(total), 0)       AS total_revenue,
          COALESCE(SUM(amount_paid), 0) AS collected,
          COALESCE(SUM(balance), 0)     AS pending,
          COUNT(*)                      AS orders_count
        FROM orders
        WHERE DATE_TRUNC('month', created_at) < DATE_TRUNC('month', NOW())
        GROUP BY DATE_TRUNC('month', created_at)
      ) f
      JOIN (
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          jsonb_object_agg(status, cnt) AS status_counts
        FROM (
          SELECT
            DATE_TRUNC('month', created_at) AS month_trunc,
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
            status,
            COUNT(*) AS cnt
          FROM orders
          WHERE DATE_TRUNC('month', created_at) < DATE_TRUNC('month', NOW())
          GROUP BY DATE_TRUNC('month', created_at), status
        ) sc
        GROUP BY month
      ) s ON s.month = f.month
      ORDER BY f.month DESC
      LIMIT 24
    `);

    // Guardar snapshots en background para auditoría (no bloquea respuesta)
    rows.forEach((r) => saveSnapshotIfMissing(r.month).catch(() => {}));

    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getPendingBalances(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.order_number, TO_CHAR(o.order_number,'FM000') AS order_number_fmt,
              c.name AS customer_name, o.total, o.amount_paid, o.balance
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.balance > 0
       ORDER BY o.balance DESC
       LIMIT 100`
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
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
