import { pool }               from "../config/database.js";
import { AppError }            from "../utils/AppError.js";
import { generateQuotePDF }    from "../utils/pdfGenerator.js";
import { sendMail }            from "../utils/mailer.js";

// ── Listar ────────────────────────────────────────────────────────
export async function list(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT q.*, u.name as created_by_name
       FROM quotes q
       LEFT JOIN users u ON u.id::text = q.created_by::text
       ORDER BY q.created_at DESC`
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// ── Obtener por ID ────────────────────────────────────────────────
export async function getById(req, res, next) {
  try {
    const { rows: [quote] } = await pool.query(
      `SELECT q.*, u.name as created_by_name
       FROM quotes q
       LEFT JOIN users u ON u.id::text = q.created_by::text
       WHERE q.id = $1`,
      [req.params.id]
    );
    if (!quote) throw new AppError("Cotización no encontrada.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: quote });
  } catch (err) { next(err); }
}

// ── Crear ─────────────────────────────────────────────────────────
export async function create(req, res, next) {
  try {
    const { customer_name, customer_email, customer_phone, customer_document, customer_address, items, notes, valid_days } = req.body;

    if (!customer_name) throw new AppError("El nombre del cliente es requerido.", 400, "VALIDATION");
    if (!Array.isArray(items) || items.length === 0)
      throw new AppError("Debe agregar al menos un producto.", 400, "VALIDATION");

    const total = items.reduce((s, i) => s + Number(i.subtotal || 0), 0);

    const { rows: [quote] } = await pool.query(
      `INSERT INTO quotes (customer_name, customer_email, customer_phone, customer_document, customer_address, items, notes, valid_days, total, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        customer_name,
        customer_email    || null,
        customer_phone    || null,
        customer_document || null,
        customer_address  || null,
        JSON.stringify(items),
        notes      || null,
        valid_days || 15,
        total,
        req.user.id,
      ]
    );

    res.status(201).json({ status: "ok", data: quote });
  } catch (err) { next(err); }
}

// ── Actualizar ────────────────────────────────────────────────────
export async function update(req, res, next) {
  try {
    const { customer_name, customer_email, customer_phone, customer_document, customer_address, items, notes, valid_days, status } = req.body;

    const { rows: [existing] } = await pool.query("SELECT * FROM quotes WHERE id=$1", [req.params.id]);
    if (!existing) throw new AppError("Cotización no encontrada.", 404, "NOT_FOUND");

    const newItems = items ?? existing.items;
    const newTotal = Array.isArray(items)
      ? items.reduce((s, i) => s + Number(i.subtotal || 0), 0)
      : existing.total;

    const { rows: [quote] } = await pool.query(
      `UPDATE quotes SET
         customer_name     = COALESCE($1,  customer_name),
         customer_email    = COALESCE($2,  customer_email),
         customer_phone    = COALESCE($3,  customer_phone),
         customer_document = COALESCE($4,  customer_document),
         customer_address  = COALESCE($5,  customer_address),
         items             = COALESCE($6,  items),
         notes             = COALESCE($7,  notes),
         valid_days        = COALESCE($8,  valid_days),
         total             = $9,
         status            = COALESCE($10, status),
         updated_at        = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        customer_name     || null,
        customer_email    || null,
        customer_phone    || null,
        customer_document || null,
        customer_address  || null,
        items ? JSON.stringify(newItems) : null,
        notes      ?? null,
        valid_days || null,
        newTotal,
        status     || null,
        req.params.id,
      ]
    );

    res.json({ status: "ok", data: quote });
  } catch (err) { next(err); }
}

// ── Eliminar ──────────────────────────────────────────────────────
export async function remove(req, res, next) {
  try {
    const { rowCount } = await pool.query("DELETE FROM quotes WHERE id=$1", [req.params.id]);
    if (!rowCount) throw new AppError("Cotización no encontrada.", 404, "NOT_FOUND");
    res.json({ status: "ok" });
  } catch (err) { next(err); }
}

// ── Descargar PDF ─────────────────────────────────────────────────
export async function downloadPDF(req, res, next) {
  try {
    const { rows: [quote] } = await pool.query("SELECT * FROM quotes WHERE id=$1", [req.params.id]);
    if (!quote) throw new AppError("Cotización no encontrada.", 404, "NOT_FOUND");

    const pdf = await generateQuotePDF(quote, req.user?.name);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="cotizacion-${String(quote.quote_number).padStart(4,"0")}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
}

// ── Enviar por correo ─────────────────────────────────────────────
export async function sendByEmail(req, res, next) {
  try {
    const { rows: [quote] } = await pool.query("SELECT * FROM quotes WHERE id=$1", [req.params.id]);
    if (!quote) throw new AppError("Cotización no encontrada.", 404, "NOT_FOUND");
    if (!quote.customer_email) throw new AppError("El cliente no tiene correo registrado.", 400, "NO_EMAIL");

    const pdf = await generateQuotePDF(quote, req.user?.name);
    const num = String(quote.quote_number).padStart(4, "0");

    await sendMail({
      to:      quote.customer_email,
      subject: `Cotización N° ${num} — Natural Ropa Deportiva`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#22c55e">Hola, ${quote.customer_name}</h2>
          <p>Adjunto encontrarás la cotización <strong>N° ${num}</strong> solicitada.</p>
          <p>Esta cotización es válida por <strong>${quote.valid_days} días</strong>.</p>
          <p>Para aprobarla o solicitar cambios, puedes responder a este correo.</p>
          <br/>
          <p style="color:#71717a;font-size:12px">Natural Ropa Deportiva — NTRL</p>
        </div>
      `,
      attachments: [{
        filename:    `cotizacion-${num}.pdf`,
        content:     pdf,
        contentType: "application/pdf",
      }],
    });

    await pool.query("UPDATE quotes SET status='sent', updated_at=NOW() WHERE id=$1", [quote.id]);
    res.json({ status: "ok", message: "Cotización enviada correctamente." });
  } catch (err) { next(err); }
}
