import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export async function getFinancialSummary(req, res, next) {
  try {
    const { rows: [order] } = await pool.query(
      `SELECT o.id, TO_CHAR(o.order_number,'FM000') as order_number,
              o.total, o.amount_paid, o.balance,
              c.name as customer_name
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.id = $1`,
      [req.params.orderId]
    );
    if (!order) throw new AppError("Pedido no encontrado.", 404, "NOT_FOUND");

    const { rows: items } = await pool.query(
      `SELECT oi.id, p.name as product_name, oi.gender, oi.sizes, oi.unit_price, oi.subtotal
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [req.params.orderId]
    );

    const { rows: payments } = await pool.query(
      `SELECT op.*, u.name as created_by_name
       FROM order_payments op
       JOIN users u ON u.id = op.created_by
       WHERE op.order_id = $1 ORDER BY op.payment_number`,
      [req.params.orderId]
    );

    res.json({ status: "ok", data: { ...order, items, payments } });
  } catch (err) { next(err); }
}

export async function updateItemPrice(req, res, next) {
  try {
    const { orderId } = req.params;
    const { item_id, unit_price } = req.body;

    const { rows } = await pool.query(
      `UPDATE order_items SET unit_price = $1
       WHERE id = $2 AND order_id = $3
       RETURNING id, unit_price, subtotal`,
      [unit_price, item_id, orderId]
    );
    if (!rows.length) throw new AppError("Item no encontrado en este pedido.", 404, "NOT_FOUND");

    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function addPayment(req, res, next) {
  try {
    const { orderId } = req.params;
    const { payment_number, amount, method, bank, paid_at } = req.body;

    // Verificar que no exceda el total del pedido
    const { rows: [order] } = await pool.query(
      "SELECT total, amount_paid FROM orders WHERE id = $1",
      [orderId]
    );
    if (!order) throw new AppError("Pedido no encontrado.", 404, "NOT_FOUND");

    // Idempotencia: si ya existe devolver 200 sin error
    const { rows: existing } = await pool.query(
      "SELECT id FROM order_payments WHERE order_id = $1 AND payment_number = $2",
      [orderId, payment_number]
    );
    if (existing.length) {
      return res.json({ status: "ok", message: "Abono ya registrado.", existing: true });
    }

    const { rows: [payment] } = await pool.query(
      `INSERT INTO order_payments (order_id, payment_number, amount, method, bank, paid_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orderId, payment_number, amount, method, bank || null, paid_at || new Date(), req.user.id]
    );

    res.status(201).json({ status: "ok", data: payment });
  } catch (err) { next(err); }
}

export async function deletePayment(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM order_payments WHERE id = $1 AND order_id = $2",
      [req.params.paymentId, req.params.orderId]
    );
    if (!rowCount) throw new AppError("Abono no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", message: "Abono eliminado." });
  } catch (err) { next(err); }
}
