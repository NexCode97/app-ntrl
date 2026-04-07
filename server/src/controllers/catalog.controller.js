import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

// ── Helpers ────────────────────────────────────────────────────

function slugify(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

async function requireAdmin(req) {
  if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
}

// ── SPORTS ────────────────────────────────────────────────────

export async function listSports(req, res, next) {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, slug, is_active, display_order FROM sports ORDER BY display_order, name"
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function createSport(req, res, next) {
  try {
    await requireAdmin(req);
    const { name, display_order } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO sports (name, slug, display_order) VALUES ($1, $2, $3) RETURNING *`,
      [name, slugify(name), display_order || 0]
    );
    res.status(201).json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function updateSport(req, res, next) {
  try {
    await requireAdmin(req);
    const { id } = req.params;
    const { name, is_active, display_order } = req.body;
    const { rows } = await pool.query(
      `UPDATE sports SET
        name = COALESCE($2, name),
        slug = CASE WHEN $2 IS NOT NULL THEN $3 ELSE slug END,
        is_active = COALESCE($4, is_active),
        display_order = COALESCE($5, display_order)
       WHERE id = $1 RETURNING *`,
      [id, name || null, name ? slugify(name) : null, is_active ?? null, display_order ?? null]
    );
    if (!rows.length) throw new AppError("Deporte no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteSport(req, res, next) {
  try {
    await requireAdmin(req);
    const { rowCount } = await pool.query("DELETE FROM sports WHERE id = $1", [req.params.id]);
    if (!rowCount) throw new AppError("Deporte no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", message: "Deporte eliminado." });
  } catch (err) { next(err); }
}

// ── LINES ─────────────────────────────────────────────────────

export async function listLines(req, res, next) {
  try {
    const { sport_id } = req.query;
    const params = [];
    let where = "WHERE 1=1";
    if (sport_id) { params.push(sport_id); where += ` AND sport_id = $${params.length}`; }

    const { rows } = await pool.query(
      `SELECT l.*, s.name as sport_name FROM lines l
       JOIN sports s ON s.id = l.sport_id
       ${where} ORDER BY l.display_order, l.name`,
      params
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function createLine(req, res, next) {
  try {
    await requireAdmin(req);
    const { sport_id, name, display_order } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO lines (sport_id, name, slug, display_order) VALUES ($1, $2, $3, $4) RETURNING *`,
      [sport_id, name, slugify(name), display_order || 0]
    );
    res.status(201).json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function updateLine(req, res, next) {
  try {
    await requireAdmin(req);
    const { id } = req.params;
    const { name, is_active, display_order } = req.body;
    const { rows } = await pool.query(
      `UPDATE lines SET
        name = COALESCE($2, name),
        slug = CASE WHEN $2 IS NOT NULL THEN $3 ELSE slug END,
        is_active = COALESCE($4, is_active),
        display_order = COALESCE($5, display_order)
       WHERE id = $1 RETURNING *`,
      [id, name || null, name ? slugify(name) : null, is_active ?? null, display_order ?? null]
    );
    if (!rows.length) throw new AppError("Línea no encontrada.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteLine(req, res, next) {
  try {
    await requireAdmin(req);
    const { rowCount } = await pool.query("DELETE FROM lines WHERE id = $1", [req.params.id]);
    if (!rowCount) throw new AppError("Línea no encontrada.", 404, "NOT_FOUND");
    res.json({ status: "ok", message: "Línea eliminada." });
  } catch (err) { next(err); }
}

// ── PRODUCTS ──────────────────────────────────────────────────

export async function listProducts(req, res, next) {
  try {
    const { line_id } = req.query;
    const params = [];
    let where = "WHERE 1=1";
    if (line_id) { params.push(line_id); where += ` AND p.line_id = $${params.length}`; }

    const { rows } = await pool.query(
      `SELECT p.*, l.name as line_name, s.name as sport_name, s.display_order as sport_order
       FROM products p
       JOIN lines l ON l.id = p.line_id
       JOIN sports s ON s.id = l.sport_id
       ${where} ORDER BY s.display_order, l.display_order, p.display_order, p.name`,
      params
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function createProduct(req, res, next) {
  try {
    await requireAdmin(req);
    const { line_id, name, display_order, price_unit, price_group, price_distributor } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [line_id, name, slugify(name), display_order || 0, price_unit || null, price_group || null, price_distributor || null]
    );
    res.status(201).json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function updateProduct(req, res, next) {
  try {
    await requireAdmin(req);
    const { id } = req.params;
    const { name, is_active, display_order, price_unit, price_group, price_distributor } = req.body;
    const { rows } = await pool.query(
      `UPDATE products SET
        name = COALESCE($2, name),
        slug = CASE WHEN $2 IS NOT NULL THEN $3 ELSE slug END,
        is_active = COALESCE($4, is_active),
        display_order = COALESCE($5, display_order),
        price_unit = $6,
        price_group = $7,
        price_distributor = $8
       WHERE id = $1 RETURNING *`,
      [id, name || null, name ? slugify(name) : null, is_active ?? null, display_order ?? null,
       price_unit ?? null, price_group ?? null, price_distributor ?? null]
    );
    if (!rows.length) throw new AppError("Producto no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteProduct(req, res, next) {
  try {
    await requireAdmin(req);
    const { rowCount } = await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    if (!rowCount) throw new AppError("Producto no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", message: "Producto eliminado." });
  } catch (err) { next(err); }
}
