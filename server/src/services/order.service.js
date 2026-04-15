import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export async function createOrder(userId, data, designFiles = []) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const designValue = designFiles.length
      ? JSON.stringify(designFiles.length === 1 ? designFiles[0] : designFiles)
      : null;

    // Crear pedido
    const { rows: [order] } = await client.query(
      `INSERT INTO orders (customer_id, created_by, delivery_date, description, design_file)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, order_number`,
      [data.customer_id, userId, data.delivery_date || null, data.description || null, designValue]
    );

    // Insertar items (el trigger calcula subtotal y total)
    for (const item of data.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, gender, sizes, unit_price, design_file_index)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.product_id, item.gender, JSON.stringify(item.sizes), item.unit_price || 0, item.design_file_index ?? null]
      );
    }

    // Registrar en historial
    await client.query(
      `INSERT INTO order_history (order_id, user_id, action)
       VALUES ($1, $2, 'Pedido creado')`,
      [order.id, userId]
    );

    await client.query("COMMIT");
    return order;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getOrderDetail(orderId) {
  const { rows: [order] } = await pool.query(
    `SELECT o.*,
            TO_CHAR(o.order_number, 'FM000') as order_number_fmt,
            c.name as customer_name, c.document_number, c.document_type,
            c.phone, c.email as customer_email, c.address, c.city, c.department,
            u.name as created_by_name, u.email as created_by_email
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     LEFT JOIN users u ON u.id = o.created_by
     WHERE o.id = $1`,
    [orderId]
  );
  if (!order) throw new AppError("Pedido no encontrado.", 404, "NOT_FOUND");

  const { rows: items } = await pool.query(
    `SELECT oi.*, p.name as product_name, l.name as line_name, s.name as sport_name
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN lines l ON l.id = p.line_id
     JOIN sports s ON s.id = l.sport_id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  const { rows: payments } = await pool.query(
    `SELECT op.*, u.name as created_by_name
     FROM order_payments op
     JOIN users u ON u.id = op.created_by
     WHERE op.order_id = $1 ORDER BY op.payment_number`,
    [orderId]
  );

  const { rows: tasks } = await pool.query(
    `SELECT pt.*, u.name as started_by_name, u2.name as completed_by_name
     FROM production_tasks pt
     LEFT JOIN users u ON u.id = pt.started_by
     LEFT JOIN users u2 ON u2.id = pt.completed_by
     WHERE pt.order_id = $1 ORDER BY pt.area`,
    [orderId]
  );

  return { ...order, items, payments, tasks };
}

export async function removeDesignFile(orderId, userId, fileToRemove) {
  const { rows: [order] } = await pool.query("SELECT design_file FROM orders WHERE id = $1", [orderId]);
  if (!order) throw new AppError("Pedido no encontrado.", 404, "NOT_FOUND");

  let files = [];
  if (order.design_file) {
    try { files = JSON.parse(order.design_file); if (!Array.isArray(files)) files = [order.design_file]; }
    catch { files = [order.design_file]; }
  }

  const updated = files.filter((f) => f !== fileToRemove);
  const newValue = updated.length === 0 ? null : updated.length === 1 ? updated[0] : JSON.stringify(updated);

  await pool.query(
    `UPDATE orders SET design_file = $1, updated_at = NOW() WHERE id = $2`,
    [newValue, orderId]
  );
  await pool.query(
    `INSERT INTO order_history (order_id, user_id, action) VALUES ($1, $2, 'Archivo de diseño eliminado')`,
    [orderId, userId]
  );
}

export async function listOrders(pagination, filters) {
  const { limit, offset, search } = pagination;
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.name ILIKE $${params.length} OR TO_CHAR(o.order_number,'FM000') LIKE $${params.length})`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`o.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT o.id, TO_CHAR(o.order_number,'FM000') as order_number,
            o.status, o.total, o.balance, o.delivery_date, o.created_at,
            c.name as customer_name
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*) FROM orders o JOIN customers c ON c.id = o.customer_id ${where}`,
    params.slice(0, -2)
  );

  return { data: rows, total: parseInt(count) };
}

export async function updateOrder(orderId, userId, data, newDesignFiles = []) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const before = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    if (!before.rows.length) throw new AppError("Pedido no encontrado.", 404, "NOT_FOUND");

    const changes = {};
    const sets = [];
    const vals = [orderId];

    if (data.customer_id && data.customer_id !== before.rows[0].customer_id) {
      vals.push(data.customer_id);
      sets.push(`customer_id = $${vals.length}`);
      changes.customer_id = { old: before.rows[0].customer_id, new: data.customer_id };
    }

    if (data.delivery_date !== undefined) {
      vals.push(data.delivery_date);
      sets.push(`delivery_date = $${vals.length}`);
      changes.delivery_date = { old: before.rows[0].delivery_date, new: data.delivery_date };
    }
    if (data.description !== undefined) {
      vals.push(data.description);
      sets.push(`description = $${vals.length}`);
      changes.description = { old: before.rows[0].description, new: data.description };
    }
    if (data.status === "delivered") {
      sets.push(`status = 'delivered'`);
      changes.status = { old: before.rows[0].status, new: "delivered" };
    }

    // Actualizar archivos de diseño
    const hasKeepList  = Array.isArray(data.design_files_keep);
    const hasNewFiles  = newDesignFiles.length > 0;
    if (hasKeepList || hasNewFiles) {
      const existing = before.rows[0].design_file;
      let base = [];
      if (hasKeepList) {
        base = data.design_files_keep; // el cliente indicó exactamente qué conservar
      } else if (existing) {
        try { base = JSON.parse(existing); if (!Array.isArray(base)) base = [existing]; }
        catch { base = [existing]; }
      }
      const combined = [...base, ...newDesignFiles];
      const designValue = combined.length === 0 ? null : JSON.stringify(combined.length === 1 ? combined[0] : combined);
      vals.push(designValue);
      sets.push(`design_file = $${vals.length}`);
      changes.design_file = "actualizado";
    }

    if (sets.length) {
      await client.query(`UPDATE orders SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1`, vals);
    }

    // Reemplazar items si se envían
    if (data.items) {
      await client.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);
      for (const item of data.items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, gender, sizes, unit_price, design_file_index)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.product_id, item.gender, JSON.stringify(item.sizes), item.unit_price || 0, item.design_file_index ?? null]
        );
      }
      changes.items = "actualizados";
    }

    if (Object.keys(changes).length) {
      await client.query(
        `INSERT INTO order_history (order_id, user_id, action, changes)
         VALUES ($1, $2, 'Pedido modificado', $3)`,
        [orderId, userId, JSON.stringify(changes)]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteOrder(orderId) {
  const { pool } = await import('../config/database.js');
  const { rowCount } = await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
  if (!rowCount) {
    const { AppError } = await import('../utils/AppError.js');
    throw new AppError('Pedido no encontrado.', 404, 'NOT_FOUND');
  }
}
