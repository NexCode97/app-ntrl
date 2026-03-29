import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export async function list(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM suppliers ORDER BY name ASC`
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { name, contact_name, phone, email, address, notes } = req.body;
    if (!name?.trim()) throw new AppError("El nombre del proveedor es requerido.", 400, "MISSING_NAME");

    const { rows: [supplier] } = await pool.query(
      `INSERT INTO suppliers (name, contact_name, phone, email, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name.trim(), contact_name?.trim()||null, phone?.trim()||null, email?.trim()||null, address?.trim()||null, notes?.trim()||null]
    );
    res.status(201).json({ status: "ok", data: supplier });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, contact_name, phone, email, address, notes, is_active } = req.body;

    const fields = {};
    if (name         !== undefined) fields.name         = name.trim();
    if (contact_name !== undefined) fields.contact_name = contact_name?.trim() || null;
    if (phone        !== undefined) fields.phone        = phone?.trim() || null;
    if (email        !== undefined) fields.email        = email?.trim() || null;
    if (address      !== undefined) fields.address      = address?.trim() || null;
    if (notes        !== undefined) fields.notes        = notes?.trim() || null;
    if (is_active    !== undefined) fields.is_active    = is_active;

    const keys = Object.keys(fields);
    if (!keys.length) throw new AppError("Nada que actualizar.", 400, "EMPTY_UPDATE");

    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const { rows: [updated] } = await pool.query(
      `UPDATE suppliers SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...Object.values(fields)]
    );
    if (!updated) throw new AppError("Proveedor no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: updated });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { rowCount } = await pool.query("DELETE FROM suppliers WHERE id = $1", [req.params.id]);
    if (!rowCount) throw new AppError("Proveedor no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", message: "Proveedor eliminado." });
  } catch (err) { next(err); }
}
