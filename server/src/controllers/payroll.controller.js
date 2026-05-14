import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

// ── Helpers ────────────────────────────────────────────────────

function requireAdminOrVendedor(req) {
  if (!["admin", "vendedor"].includes(req.user.role))
    throw new AppError("Acceso denegado.", 403, "FORBIDDEN");
}

// ══════════════════════════════════════════════════════════════
// PERÍODOS
// ══════════════════════════════════════════════════════════════

export async function listPeriods(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { rows } = await pool.query(`
      SELECT
        p.*,
        u_c.name AS created_by_nombre,
        u_a.name AS approved_by_nombre,
        COUNT(pt.id)::int AS total_empleados,
        COALESCE(SUM(pt.neto_pagable), 0) AS total_nomina
      FROM payroll_periods p
      LEFT JOIN users u_c ON u_c.id = p.created_by
      LEFT JOIN users u_a ON u_a.id = p.approved_by
      LEFT JOIN payroll_transactions pt ON pt.period_id = p.id
      GROUP BY p.id, u_c.name, u_a.name
      ORDER BY p.fecha_inicio DESC
    `);
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getPeriod(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT
        p.*,
        u_c.name AS created_by_nombre,
        u_a.name AS approved_by_nombre
      FROM payroll_periods p
      LEFT JOIN users u_c ON u_c.id = p.created_by
      LEFT JOIN users u_a ON u_a.id = p.approved_by
      WHERE p.id = $1
    `, [id]);
    if (!rows.length) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function createPeriod(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { nombre, fecha_inicio, fecha_fin } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO payroll_periods (nombre, fecha_inicio, fecha_fin, created_by)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [nombre, fecha_inicio, fecha_fin, req.user.id]);
    res.status(201).json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

export async function deletePeriod(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores pueden eliminar períodos.", 403, "FORBIDDEN");
    const { id } = req.params;
    const { rows: period } = await pool.query(`SELECT estado FROM payroll_periods WHERE id = $1`, [id]);
    if (!period.length) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    if (["aprobado", "pagado"].includes(period[0].estado))
      throw new AppError("No se puede eliminar un período aprobado o pagado.", 409, "CONFLICT");
    await pool.query(`DELETE FROM payroll_periods WHERE id = $1`, [id]);
    res.json({ status: "ok", message: "Período eliminado." });
  } catch (err) { next(err); }
}

// ══════════════════════════════════════════════════════════════
// GENERAR NÓMINA (poblar transacciones con empleados activos)
// ══════════════════════════════════════════════════════════════

export async function generatePayroll(req, res, next) {
  const client = await pool.connect();
  try {
    requireAdminOrVendedor(req);
    const { id } = req.params;

    await client.query("BEGIN");

    const { rows: [period] } = await client.query(
      `SELECT * FROM payroll_periods WHERE id = $1`, [id]
    );
    if (!period) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    if (period.estado !== "borrador")
      throw new AppError("Solo se puede generar nómina en períodos en borrador.", 409, "CONFLICT");

    // Obtener empleados activos
    const { rows: employees } = await client.query(
      `SELECT id, salario_base FROM employees WHERE estado_laboral = 'activo'`
    );
    if (!employees.length) throw new AppError("No hay empleados activos para generar nómina.", 400, "BAD_REQUEST");

    // Insertar transacción por cada empleado (ON CONFLICT DO NOTHING para no duplicar)
    for (const emp of employees) {
      await client.query(`
        INSERT INTO payroll_transactions (employee_id, period_id, salario_base)
        VALUES ($1, $2, $3)
        ON CONFLICT (employee_id, period_id) DO NOTHING
      `, [emp.id, id, emp.salario_base]);
    }

    // Marcar período como generado
    await client.query(
      `UPDATE payroll_periods SET estado = 'generado' WHERE id = $1`, [id]
    );

    await client.query("COMMIT");

    res.json({ status: "ok", message: `Nómina generada para ${employees.length} empleado(s).` });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

// ══════════════════════════════════════════════════════════════
// TRANSACCIONES DEL PERÍODO
// ══════════════════════════════════════════════════════════════

export async function listTransactions(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT
        pt.*,
        e.nombre        AS empleado_nombre,
        e.cargo         AS empleado_cargo,
        e.cuenta_banco  AS empleado_cuenta,
        e.banco         AS empleado_banco,
        e.numero_identificacion AS empleado_identificacion,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', pe.id, 'tipo', pe.tipo, 'concepto', pe.concepto, 'valor', pe.valor
          )) FILTER (WHERE pe.id IS NOT NULL), '[]'
        ) AS earnings,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', pd.id, 'tipo', pd.tipo, 'concepto', pd.concepto, 'valor', pd.valor, 'porcentaje', pd.porcentaje
          )) FILTER (WHERE pd.id IS NOT NULL), '[]'
        ) AS deductions
      FROM payroll_transactions pt
      JOIN employees e ON e.id = pt.employee_id
      LEFT JOIN payroll_earnings pe ON pe.transaction_id = pt.id
      LEFT JOIN payroll_deductions pd ON pd.transaction_id = pt.id
      WHERE pt.period_id = $1
      GROUP BY pt.id, e.nombre, e.cargo, e.cuenta_banco, e.banco, e.numero_identificacion
      ORDER BY e.nombre ASC
    `, [id]);
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// ══════════════════════════════════════════════════════════════
// INGRESOS ADICIONALES
// ══════════════════════════════════════════════════════════════

export async function addEarning(req, res, next) {
  const client = await pool.connect();
  try {
    requireAdminOrVendedor(req);
    const { txId } = req.params;
    const { tipo, concepto, valor } = req.body;

    await client.query("BEGIN");

    const { rows: [earning] } = await client.query(`
      INSERT INTO payroll_earnings (transaction_id, tipo, concepto, valor)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [txId, tipo, concepto || null, valor]);

    // Recalcular total ingresos adicionales en la transacción
    await client.query(`
      UPDATE payroll_transactions
      SET ingresos_adicionales = (
        SELECT COALESCE(SUM(valor), 0) FROM payroll_earnings WHERE transaction_id = $1
      )
      WHERE id = $1
    `, [txId]);

    await client.query("COMMIT");
    res.status(201).json({ status: "ok", data: earning });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

export async function deleteEarning(req, res, next) {
  const client = await pool.connect();
  try {
    requireAdminOrVendedor(req);
    const { txId, earningId } = req.params;

    await client.query("BEGIN");
    await client.query(`DELETE FROM payroll_earnings WHERE id = $1 AND transaction_id = $2`, [earningId, txId]);

    await client.query(`
      UPDATE payroll_transactions
      SET ingresos_adicionales = (
        SELECT COALESCE(SUM(valor), 0) FROM payroll_earnings WHERE transaction_id = $1
      )
      WHERE id = $1
    `, [txId]);

    await client.query("COMMIT");
    res.json({ status: "ok", message: "Ingreso eliminado." });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

// ══════════════════════════════════════════════════════════════
// DEDUCCIONES
// ══════════════════════════════════════════════════════════════

export async function addDeduction(req, res, next) {
  const client = await pool.connect();
  try {
    requireAdminOrVendedor(req);
    const { txId } = req.params;
    const { tipo, concepto, valor, porcentaje } = req.body;

    await client.query("BEGIN");

    const { rows: [deduction] } = await client.query(`
      INSERT INTO payroll_deductions (transaction_id, tipo, concepto, valor, porcentaje)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [txId, tipo, concepto || null, valor, porcentaje || null]);

    await client.query(`
      UPDATE payroll_transactions
      SET total_deducciones = (
        SELECT COALESCE(SUM(valor), 0) FROM payroll_deductions WHERE transaction_id = $1
      )
      WHERE id = $1
    `, [txId]);

    await client.query("COMMIT");
    res.status(201).json({ status: "ok", data: deduction });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

export async function deleteDeduction(req, res, next) {
  const client = await pool.connect();
  try {
    requireAdminOrVendedor(req);
    const { txId, deductionId } = req.params;

    await client.query("BEGIN");
    await client.query(`DELETE FROM payroll_deductions WHERE id = $1 AND transaction_id = $2`, [deductionId, txId]);

    await client.query(`
      UPDATE payroll_transactions
      SET total_deducciones = (
        SELECT COALESCE(SUM(valor), 0) FROM payroll_deductions WHERE transaction_id = $1
      )
      WHERE id = $1
    `, [txId]);

    await client.query("COMMIT");
    res.json({ status: "ok", message: "Deducción eliminada." });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

// ══════════════════════════════════════════════════════════════
// APROBAR Y MARCAR COMO PAGADO
// ══════════════════════════════════════════════════════════════

export async function approvePeriod(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo el administrador puede aprobar nóminas.", 403, "FORBIDDEN");
    const { id } = req.params;
    const { rows: [period] } = await pool.query(`SELECT estado FROM payroll_periods WHERE id = $1`, [id]);
    if (!period) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    if (period.estado !== "generado") throw new AppError("Solo se pueden aprobar períodos en estado 'generado'.", 409, "CONFLICT");

    const { rows: [updated] } = await pool.query(`
      UPDATE payroll_periods
      SET estado = 'aprobado', approved_by = $2, approved_at = NOW()
      WHERE id = $1 RETURNING *
    `, [id, req.user.id]);
    res.json({ status: "ok", data: updated });
  } catch (err) { next(err); }
}

export async function markAsPaid(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo el administrador puede marcar como pagado.", 403, "FORBIDDEN");
    const { id } = req.params;
    const { rows: [period] } = await pool.query(`SELECT estado FROM payroll_periods WHERE id = $1`, [id]);
    if (!period) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    if (period.estado !== "aprobado") throw new AppError("Solo se pueden marcar como pagados períodos aprobados.", 409, "CONFLICT");

    const { rows: [updated] } = await pool.query(`
      UPDATE payroll_periods SET estado = 'pagado' WHERE id = $1 RETURNING *
    `, [id]);
    res.json({ status: "ok", data: updated });
  } catch (err) { next(err); }
}

// ══════════════════════════════════════════════════════════════
// EXPORTAR TXT BANCARIO
// ══════════════════════════════════════════════════════════════

export async function exportTxt(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { id } = req.params;

    const { rows } = await pool.query(`
      SELECT
        e.nombre, e.cuenta_banco, e.banco, e.numero_identificacion,
        pt.neto_pagable
      FROM payroll_transactions pt
      JOIN employees e ON e.id = pt.employee_id
      WHERE pt.period_id = $1
      ORDER BY e.nombre ASC
    `, [id]);

    if (!rows.length) throw new AppError("No hay transacciones en este período.", 404, "NOT_FOUND");

    const lines = rows.map((r) =>
      `${r.numero_identificacion};${r.nombre};${r.banco ?? ""};${r.cuenta_banco ?? ""};${Number(r.neto_pagable).toFixed(0)}`
    );

    const txt = [
      "IDENTIFICACION;NOMBRE;BANCO;CUENTA;VALOR",
      ...lines,
    ].join("\r\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="nomina_${id}.txt"`);
    res.send(txt);
  } catch (err) { next(err); }
}
