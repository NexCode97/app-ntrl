import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { notifyAdmins } from "../utils/sseManager.js";

export async function list(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";
    const { status } = req.query;

    const params = [];
    let where = isAdmin ? "WHERE 1=1" : "WHERE sr.worker_id = $1";
    if (!isAdmin) params.push(req.user.id);

    if (status) {
      params.push(status);
      where += ` AND sr.status = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT sr.*,
              u.name  AS worker_name,
              u.area  AS worker_area,
              o.order_number
       FROM supply_requests sr
       JOIN users  u ON u.id = sr.worker_id
       LEFT JOIN orders o ON o.id = sr.order_id
       ${where}
       ORDER BY sr.created_at DESC`,
      params
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { item_name, quantity, unit, order_id, notes } = req.body;
    if (!item_name?.trim()) throw new AppError("El nombre del insumo es requerido.", 400, "MISSING_ITEM");
    if (!quantity || isNaN(quantity) || quantity <= 0) throw new AppError("La cantidad debe ser mayor a 0.", 400, "INVALID_QTY");

    // Verificar que el pedido pertenece a la empresa (si se especificó)
    if (order_id) {
      const { rows } = await pool.query("SELECT id, order_number FROM orders WHERE id = $1", [order_id]);
      if (!rows.length) throw new AppError("Pedido no encontrado.", 404, "ORDER_NOT_FOUND");
    }

    const { rows: [req_] } = await pool.query(
      `INSERT INTO supply_requests (worker_id, order_id, item_name, quantity, unit, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, order_id || null, item_name.trim(), quantity, unit || "unidades", notes?.trim() || null]
    );

    // Notificar a admins
    const { rows: [worker] } = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
    await notifyAdmins(
      "supply_request",
      `${worker.name} solicitó: ${item_name.trim()} (${quantity} ${unit || "unidades"})`,
      { supplyId: req_.id }
    );

    res.status(201).json({ status: "ok", data: req_ });
  } catch (err) { next(err); }
}

export async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const isAdmin = req.user.role === "admin";
    const VALID = ["pending", "in_progress", "delivered"];
    if (!VALID.includes(status)) throw new AppError("Estado inválido.", 400, "INVALID_STATUS");

    // Worker solo puede marcar como delivered sus propias solicitudes pendientes o en proceso
    if (!isAdmin) {
      if (status !== "delivered") throw new AppError("No tienes permisos para este cambio.", 403, "FORBIDDEN");
      const { rows: [supply] } = await pool.query(
        "SELECT id, status FROM supply_requests WHERE id = $1 AND worker_id = $2",
        [id, req.user.id]
      );
      if (!supply) throw new AppError("Solicitud no encontrada.", 404, "NOT_FOUND");
      if (supply.status === "delivered") throw new AppError("Ya fue marcada como entregada.", 400, "ALREADY_DELIVERED");
    }

    const { rows: [updated] } = await pool.query(
      `UPDATE supply_requests
       SET status = $1, admin_notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, admin_notes?.trim() || null, id]
    );
    if (!updated) throw new AppError("Solicitud no encontrada.", 404, "NOT_FOUND");

    // Notificar al trabajador del cambio de estado
    const STATUS_LABELS = { pending:"Pendiente", in_progress:"En proceso", delivered:"Entregado" };
    const { sendToUser } = await import("../utils/sseManager.js");
    sendToUser(updated.worker_id, {
      type: "supply_status",
      message: `Tu solicitud de "${updated.item_name}" fue ${STATUS_LABELS[status].toLowerCase()}`,
      data: { supplyId: id, status },
    });

    res.json({ status: "ok", data: updated });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    // Worker solo puede eliminar sus propias solicitudes pendientes
    const where = req.user.role === "admin"
      ? "WHERE id = $1"
      : "WHERE id = $1 AND worker_id = $2 AND status = 'pending'";
    const params = req.user.role === "admin" ? [id] : [id, req.user.id];

    const { rowCount } = await pool.query(`DELETE FROM supply_requests ${where}`, params);
    if (!rowCount) throw new AppError("No se pudo eliminar la solicitud.", 403, "FORBIDDEN");

    res.json({ status: "ok", message: "Solicitud eliminada." });
  } catch (err) { next(err); }
}
