import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

// ── Helpers ────────────────────────────────────────────────────

function requireAdminOrVendedor(req) {
  if (!["admin", "vendedor"].includes(req.user.role))
    throw new AppError("Acceso denegado.", 403, "FORBIDDEN");
}

const fmt = (v) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

// ── LIST ───────────────────────────────────────────────────────

export async function listEmployees(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { estado, q } = req.query;

    let sql = `
      SELECT
        e.*,
        u.name AS user_nombre, u.email AS user_email
      FROM employees e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      params.push(estado);
      sql += ` AND e.estado_laboral = $${params.length}`;
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      sql += ` AND (LOWER(e.nombre) LIKE $${params.length} OR e.numero_identificacion LIKE $${params.length} OR LOWER(e.cargo) LIKE $${params.length})`;
    }

    sql += ` ORDER BY e.nombre ASC`;

    const { rows } = await pool.query(sql, params);
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// ── GET ONE ────────────────────────────────────────────────────

export async function getEmployee(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT e.*, u.name AS user_nombre
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.id = $1`,
      [id]
    );
    if (!rows.length) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

// ── CREATE ─────────────────────────────────────────────────────

export async function createEmployee(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const {
      nombre, email, cargo, salario_base,
      cuenta_banco, banco, tipo_identificacion,
      numero_identificacion, fecha_ingreso,
      estado_laboral, user_id, notas,
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO employees
         (nombre, email, cargo, salario_base, cuenta_banco, banco,
          tipo_identificacion, numero_identificacion, fecha_ingreso,
          estado_laboral, user_id, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        nombre, email || null, cargo, salario_base,
        cuenta_banco || null, banco || null,
        tipo_identificacion || "CC", numero_identificacion,
        fecha_ingreso, estado_laboral || "activo",
        user_id || null, notas || null,
      ]
    );
    res.status(201).json({ status: "ok", data: rows[0] });
  } catch (err) {
    if (err.code === "23505") return next(new AppError("Ya existe un empleado con ese número de identificación.", 409, "CONFLICT"));
    next(err);
  }
}

// ── UPDATE ─────────────────────────────────────────────────────

export async function updateEmployee(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { id } = req.params;
    const fields = req.body;

    const allowed = [
      "nombre","email","cargo","salario_base","cuenta_banco","banco",
      "tipo_identificacion","numero_identificacion","fecha_ingreso",
      "estado_laboral","user_id","notas",
    ];

    const sets = [];
    const params = [id];

    for (const key of allowed) {
      if (key in fields) {
        params.push(fields[key] ?? null);
        sets.push(`${key} = $${params.length}`);
      }
    }

    if (!sets.length) throw new AppError("No hay campos para actualizar.", 400, "BAD_REQUEST");

    const { rows } = await pool.query(
      `UPDATE employees SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
      params
    );
    if (!rows.length) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) {
    if (err.code === "23505") return next(new AppError("Ya existe un empleado con ese número de identificación.", 409, "CONFLICT"));
    next(err);
  }
}

// ── DELETE ─────────────────────────────────────────────────────

export async function deleteEmployee(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores pueden eliminar empleados.", 403, "FORBIDDEN");
    const { id } = req.params;

    // Verificar que no tenga transacciones de nómina
    const { rows: txs } = await pool.query(
      `SELECT id FROM payroll_transactions WHERE employee_id = $1 LIMIT 1`, [id]
    );
    if (txs.length) throw new AppError(
      "No se puede eliminar: el empleado tiene nóminas registradas. Cambia su estado a 'terminado'.",
      409, "CONFLICT"
    );

    const { rows } = await pool.query(`DELETE FROM employees WHERE id = $1 RETURNING id`, [id]);
    if (!rows.length) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", message: "Empleado eliminado." });
  } catch (err) { next(err); }
}
