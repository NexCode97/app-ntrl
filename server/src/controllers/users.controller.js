import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export async function list(req, res, next) {
  try {
    const { limit, offset, search } = req.pagination;
    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT id, name, email, role, area, position, is_active, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM users ${where}`,
      params.slice(0, -2)
    );

    res.json({ status: "ok", data: rows, total: parseInt(count), limit, offset });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { name, email, password, role, area, position } = req.body;
    const hash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, area, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, area, position, created_at`,
      [name, email.toLowerCase(), hash, role, area || null, position || null]
    );

    res.status(201).json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, password, role, area, position, is_active } = req.body;

    const fields = {};
    if (name      !== undefined) fields.name      = name;
    if (email     !== undefined) fields.email     = email.toLowerCase();
    if (role      !== undefined) fields.role      = role;
    if (area      !== undefined) fields.area      = area || null;
    if (position  !== undefined) fields.position  = position || null;
    if (is_active !== undefined) fields.is_active = is_active;

    if (password) {
      fields.password_hash = await bcrypt.hash(password, 12);
    }

    const keys = Object.keys(fields);
    if (keys.length === 0) throw new AppError("Nada que actualizar.", 400, "EMPTY_UPDATE");

    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE users SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, area, position, is_active`,
      [id, ...Object.values(fields)]
    );

    if (!rows.length) throw new AppError("Usuario no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user.id) throw new AppError("No puedes eliminar tu propia cuenta.", 400, "SELF_DELETE");

    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    if (!rowCount) throw new AppError("Usuario no encontrado.", 404, "NOT_FOUND");

    res.json({ status: "ok", message: "Usuario eliminado." });
  } catch (err) { next(err); }
}
