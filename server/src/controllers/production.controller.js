import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { notifyAdmins, broadcastInvalidate } from "../utils/sseManager.js";
import { pushToRoles } from "../utils/pushNotifications.js";
import { redis } from "../config/redis.js";

// Vista general de producción para el admin: pedidos activos con estado por área
export async function getProductionOverview(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.order_number,
              TO_CHAR(o.order_number,'FM000') AS order_number_fmt,
              o.delivery_date, o.status AS order_status,
              c.name AS customer_name,
              json_agg(
                json_build_object('area', pt.area, 'status', pt.status)
                ORDER BY pt.area
              ) AS tasks
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       JOIN production_tasks pt ON pt.order_id = o.id
       WHERE o.status NOT IN ('delivered', 'cancelled')
       GROUP BY o.id, o.order_number, o.delivery_date, o.status, c.name
       ORDER BY o.delivery_date ASC NULLS LAST, o.created_at ASC`
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getTasksByOrder(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT pt.*, u.name as started_by_name, u2.name as completed_by_name
       FROM production_tasks pt
       LEFT JOIN users u  ON u.id  = pt.started_by
       LEFT JOIN users u2 ON u2.id = pt.completed_by
       WHERE pt.order_id = $1 ORDER BY pt.area`,
      [req.params.orderId]
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getMyTasks(req, res, next) {
  try {
    // diseno → solo diseno_disenar; impresion → impresion (área propia)
    const areas = req.user.area === "diseno"
      ? ["diseno_disenar"]
      : [req.user.area];

    const { rows } = await pool.query(
      `SELECT pt.*, o.order_number, TO_CHAR(o.order_number,'FM000') as order_number_fmt,
              o.delivery_date, c.name as customer_name
       FROM production_tasks pt
       JOIN orders o ON o.id = pt.order_id
       JOIN customers c ON c.id = o.customer_id
       WHERE pt.area = ANY($1)
       ORDER BY o.delivery_date ASC NULLS LAST, o.created_at ASC`,
      [areas]
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function updateTaskStatus(req, res, next) {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!["in_progress", "done"].includes(status)) {
      throw new AppError("Estado inválido. Usa 'in_progress' o 'done'.", 400, "INVALID_STATUS");
    }

    const { rows: [task] } = await pool.query("SELECT * FROM production_tasks WHERE id = $1", [taskId]);
    if (!task) throw new AppError("Tarea no encontrada.", 404, "NOT_FOUND");

    // Verificar que el trabajador pertenece al área de esta tarea
    const userAreas = req.user.area === "diseno"
      ? ["diseno_disenar"]
      : [req.user.area];
    if (req.user.role !== "admin" && !userAreas.includes(task.area)) {
      throw new AppError("No puedes modificar tareas de otra área.", 403, "FORBIDDEN");
    }

    const updates = ["status = $2"];
    const vals = [taskId, status];

    if (status === "in_progress" && !task.started_by) {
      updates.push(`started_by = $${vals.length + 1}`, `started_at = NOW()`);
      vals.push(req.user.id);
    }
    if (status === "done") {
      updates.push(`completed_by = $${vals.length + 1}`, `completed_at = NOW()`);
      vals.push(req.user.id);
    }

    const { rows: [updated] } = await pool.query(
      `UPDATE production_tasks SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
      vals
    );

    // Notificar a los admins en cualquier cambio de estado
    const { rows: [order] } = await pool.query(
      "SELECT order_number FROM orders WHERE id = $1",
      [task.order_id]
    );
    const AREA_NAMES = {
      corte: "Corte", diseno_disenar: "Diseño",
      impresion: "Impresión", sublimacion: "Sublimación",
      ensamble: "Ensamble", terminados: "Terminados",
    };
    const areaLabel = AREA_NAMES[task.area] ?? task.area;
    const orderNum  = String(order?.order_number ?? "").padStart(3, "0");
    const eventType = status === "done" ? "area_completed" : "area_started";
    const eventMsg  = status === "done"
      ? `${areaLabel} completó su tarea en el pedido #${orderNum}`
      : `${areaLabel} inició su tarea en el pedido #${orderNum}`;
    notifyAdmins(eventType, eventMsg,
      { orderId: task.order_id, orderNumber: order?.order_number, area: task.area }
    ).catch(() => {});
    if (status === "done") {
      pushToRoles(["admin", "vendedor"], {
        title: "Area completada",
        body: `${areaLabel} completo su tarea en el pedido #${orderNum}`,
        url: `/orders/${task.order_id}?tab=production`,
      }).catch(() => {});
    }

    redis.del("dashboard:summary").catch(() => {});
    broadcastInvalidate(["order", task.order_id], "production", "dashboard");
    res.json({ status: "ok", data: updated });
  } catch (err) { next(err); }
}

// Avance detallado por producto + talla + área dentro de un pedido
export async function getOrderProgress(req, res, next) {
  try {
    const { orderId } = req.params;
    const { rows } = await pool.query(
      `SELECT pip.order_item_id, pip.area, pip.size, pip.is_done,
              pip.updated_at, u.name AS updated_by_name
       FROM production_item_progress pip
       LEFT JOIN users u ON u.id = pip.updated_by
       WHERE pip.order_item_id IN (SELECT id FROM order_items WHERE order_id = $1)`,
      [orderId]
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// Marcar / desmarcar un item+talla+area como hecho
export async function setItemProgress(req, res, next) {
  try {
    const { itemId, area, size } = req.params;
    const { is_done } = req.body;

    const userAreas = req.user.area === "diseno" ? ["diseno_disenar"] : [req.user.area];
    if (req.user.role !== "admin" && !userAreas.includes(area)) {
      throw new AppError("No puedes modificar el avance de otra área.", 403, "FORBIDDEN");
    }

    await pool.query(
      `INSERT INTO production_item_progress (order_item_id, area, size, is_done, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (order_item_id, area, size) DO UPDATE
       SET is_done = $4, updated_by = $5, updated_at = NOW()`,
      [itemId, area, size, !!is_done, req.user.id]
    );

    // Invalidar caches del pedido
    const { rows: [it] } = await pool.query("SELECT order_id FROM order_items WHERE id = $1", [itemId]);
    if (it?.order_id) broadcastInvalidate(["order", it.order_id], "production");

    res.json({ status: "ok" });
  } catch (err) { next(err); }
}
