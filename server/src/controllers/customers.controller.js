import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export async function list(req, res, next) {
  try {
    const { limit, offset, search } = req.pagination;
    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $${params.length} OR document_number ILIKE $${params.length})`;
    }

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM customers ${where}
       ORDER BY name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM customers ${where}`,
      params.slice(0, -2)
    );

    res.json({ status: "ok", data: rows, total: parseInt(count), limit, offset });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { name, document_type, document_number, is_company, address, city, department, phone, email } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO customers (name, document_type, document_number, is_company, address, city, department, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, document_type, document_number, is_company, address || null, city || null, department || null, phone || null, email || null]
    );

    res.status(201).json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const fields = { ...req.body };
    const keys = Object.keys(fields);
    if (!keys.length) throw new AppError("Nada que actualizar.", 400, "EMPTY_UPDATE");

    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE customers SET ${setClause}, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, ...Object.values(fields)]
    );

    if (!rows.length) throw new AppError("Cliente no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function getById(req, res, next) {
  try {
    const { rows } = await pool.query("SELECT * FROM customers WHERE id = $1", [req.params.id]);
    if (!rows.length) throw new AppError("Cliente no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { rowCount } = await pool.query("DELETE FROM customers WHERE id = $1", [req.params.id]);
    if (!rowCount) throw new AppError("Cliente no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok" });
  } catch (err) { next(err); }
}
