import PDFDocument from "pdfkit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, "../assets/logo.png");

const GREEN = "#22c55e";
const BLACK = "#111111";
const GRAY  = "#555555";
const LGRAY = "#f5f5f5";
const WHITE = "#ffffff";

const EMPRESA = {
  nombre:    "Natural Ropa Deportiva",
  direccion: "Calle 22#17-21",
  ciudad:    "Bucaramanga, Santander",
  tel:       "+57 (313) 829 6551",
  web:       "www.naturalropadeportiva.com.co",
};

const STATUS_ES = {
  draft:    "Borrador",
  sent:     "Enviada",
  approved: "Aprobada",
  rejected: "Rechazada",
};

function fmtPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  // Si ya tiene indicativo colombiano (57 + 10 dígitos)
  const local = digits.startsWith("57") && digits.length === 12 ? digits.slice(2) : digits;
  if (local.length === 10) {
    return `+57 (${local.slice(0,3)}) ${local.slice(3,6)} ${local.slice(6)}`;
  }
  // Si no coincide con el formato esperado, devolver con +57 al menos
  return digits.startsWith("57") ? `+${digits}` : `+57 ${raw}`;
}

function fmt(n) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`;
}

/* ─── COTIZACIÓN ──────────────────────────────────────────────── */
export function generateQuotePDF(quote, emittedBy) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 45, size: "A4", autoFirstPage: true });
    const chunks = [];
    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W  = doc.page.width;   // 595
    const m  = 45;               // margen
    const cW = W - m * 2;       // ancho contenido: 505

    // ── ENCABEZADO ──────────────────────────────────────────────
    // Logo (izquierda)
    try {
      doc.image(LOGO_PATH, m, m, { height: 55, fit: [120, 55] });
    } catch { /* si falla, sin logo */ }

    // Título COTIZACIÓN (derecha)
    doc.fontSize(26).fillColor(BLACK).font("Helvetica-Bold")
       .text("COTIZACIÓN", m, m + 4, { align: "right", width: cW });

    // Número cotización (derecha, debajo del título)
    const numStr = `N° ${String(quote.quote_number).padStart(6, "0")}`;
    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text(numStr, m, m + 36, { align: "right", width: cW });

    // Fecha (derecha, debajo del número)
    const fecha = new Date(quote.created_at).toLocaleDateString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    doc.fontSize(9).fillColor(GRAY)
       .text(fecha, m, m + 49, { align: "right", width: cW });

    // Línea separadora
    const lineY = m + 70;
    doc.moveTo(m, lineY).lineTo(W - m, lineY).lineWidth(1.5).strokeColor(GREEN).stroke();

    // ── BLOQUE DOS COLUMNAS: CLIENTE | EMPRESA ───────────────────
    const colY    = lineY + 14;
    const colW    = cW / 2 - 10;
    const colRX   = m + cW / 2 + 10;   // X inicio columna derecha

    // — Columna izquierda: DATOS DEL CLIENTE —
    doc.fontSize(8).fillColor(GREEN).font("Helvetica-Bold")
       .text("DATOS DEL CLIENTE", m, colY);

    doc.fontSize(10).fillColor(BLACK).font("Helvetica-Bold")
       .text(quote.customer_name || "", m, colY + 13, { width: colW });

    let cliY = colY + 27;
    doc.fontSize(9).fillColor(GRAY).font("Helvetica");
    if (quote.customer_document) {
      const docLabel = { cedula: "C.C.", nit: "NIT", ce: "C.E.", pp: "PP" }[quote.customer_document_type] ?? "C.C.";
      doc.text(`${docLabel} ${quote.customer_document}`, m, cliY, { width: colW }); cliY += 13;
    }
    if (quote.customer_address)  { doc.text(quote.customer_address, m, cliY, { width: colW }); cliY += 13; }
    if (quote.customer_city || quote.customer_department) {
      const locParts = [];
      if (quote.customer_city)       locParts.push(quote.customer_city);
      if (quote.customer_department) locParts.push(quote.customer_department);
      doc.text(locParts.join(", "), m, cliY, { width: colW });
      cliY += 13;
    }
    const phoneFmt = fmtPhone(quote.customer_phone);
    if (phoneFmt)                { doc.text(phoneFmt,              m, cliY, { width: colW }); cliY += 13; }
    if (quote.customer_email)    { doc.text(quote.customer_email,  m, cliY, { width: colW }); cliY += 13; }

    // — Columna derecha: DATOS DE LA EMPRESA (alineada a la derecha) —
    doc.fontSize(8).fillColor(GREEN).font("Helvetica-Bold")
       .text("DATOS DE LA EMPRESA", colRX, colY, { width: colW, align: "right" });

    doc.fontSize(9).fillColor(BLACK).font("Helvetica-Bold")
       .text(EMPRESA.nombre, colRX, colY + 13, { width: colW, align: "right" });

    doc.fontSize(9).fillColor(GRAY).font("Helvetica");
    const empLines = [
      `NIT: 91156614-3`,
      EMPRESA.direccion,
      EMPRESA.ciudad,
      EMPRESA.tel,
      quote.created_by_email || null,
      EMPRESA.web,
    ].filter(Boolean);
    let empY = colY + 26;
    empLines.forEach((line) => {
      doc.text(line, colRX, empY, { width: colW, align: "right" });
      empY += 13;
    });

    // ── TABLA DE PRODUCTOS ───────────────────────────────────────
    const tableY = Math.max(cliY, empY) + 18;

    // Cabecera tabla
    const cols = {
      cant:     { x: m,            w: 40  },
      producto: { x: m + 40,       w: 195 },
      tallas:   { x: m + 235,      w: 110 },
      precio:   { x: m + 345,      w: 75  },
      subtotal: { x: m + 420,      w: 85  },
    };
    const hdrH = 20;

    doc.rect(m, tableY, cW, hdrH).fill(BLACK);
    doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold");
    doc.text("CANT",      cols.cant.x,          tableY + 6, { width: cols.cant.w,          align: "center" });
    doc.text("PRODUCTO",  cols.producto.x + 4,  tableY + 6, { width: cols.producto.w });
    doc.text("TALLAS",    cols.tallas.x,         tableY + 6, { width: cols.tallas.w, align: "center" });
    doc.text("P. UNIT",   cols.precio.x,         tableY + 6, { width: cols.precio.w,        align: "center" });
    doc.text("SUBTOTAL",  cols.subtotal.x,       tableY + 6, { width: cols.subtotal.w,      align: "center" });

    // Filas
    const items = Array.isArray(quote.items) ? quote.items : [];
    let rowY = tableY + hdrH;

    items.forEach((item, i) => {
      const qty = item.quantity ||
        Object.values(item.sizes || {}).reduce((a, q) => a + (Number(q) || 0), 0);
      const sizesStr = Object.entries(item.sizes || {})
        .filter(([, q]) => q > 0).map(([s, q]) => `${s}:${q}`).join("  ");
      const subtotal = item.subtotal || qty * (item.unit_price || 0);

      // Calcular altura de fila: nombre + género + padding superior e inferior
      const prodLines = doc.heightOfString(item.product_name || "", { width: cols.producto.w - 8, fontSize: 9 });
      const rowH = Math.max(prodLines + 28, 38);
      const midY = rowY + (rowH / 2) - 5;  // centro vertical para valores de una línea

      if (i % 2 === 0) doc.rect(m, rowY, cW, rowH).fill(LGRAY);
      else              doc.rect(m, rowY, cW, rowH).fill(WHITE);

      doc.fontSize(9).fillColor(BLACK);

      doc.font("Helvetica")
         .text(String(qty), cols.cant.x, midY, { width: cols.cant.w, align: "center" });
      doc.font("Helvetica-Bold")
         .text(item.product_name || "", cols.producto.x + 4, rowY + 10, { width: cols.producto.w - 8 });
      doc.font("Helvetica").fillColor(GRAY)
         .text(item.gender || "", cols.producto.x + 4, rowY + 10 + 13, { width: cols.producto.w - 8 });
      doc.fillColor(BLACK)
         .text(sizesStr, cols.tallas.x, midY, { width: cols.tallas.w, align: "center" });
      doc.text(fmt(item.unit_price), cols.precio.x, midY, { width: cols.precio.w, align: "center" });
      doc.font("Helvetica-Bold")
         .text(fmt(subtotal), cols.subtotal.x, midY, { width: cols.subtotal.w, align: "center" });

      // Línea divisoria fila
      doc.moveTo(m, rowY + rowH).lineTo(W - m, rowY + rowH).lineWidth(0.3).strokeColor("#dddddd").stroke();

      rowY += rowH;
    });

    // Borde tabla
    doc.rect(m, tableY, cW, rowY - tableY).lineWidth(0.5).strokeColor("#cccccc").stroke();

    // ── TOTAL ────────────────────────────────────────────────────
    // La caja ocupa las columnas precio + subtotal con margen interno de 6px a cada lado
    const totalBoxX = cols.precio.x + 6;
    const totalBoxW = cols.precio.w + cols.subtotal.w - 12;
    const totalBoxH = 26;
    rowY += 8;

    doc.fontSize(9).font("Helvetica-Bold");
    const totalLineH   = doc.currentLineHeight(true);
    const padTop       = 5;
    const padBottom    = 2;  // recortado abajo para compensar leading interno
    const totalBoxHFit = totalLineH + padTop + padBottom;

    doc.roundedRect(totalBoxX, rowY, totalBoxW, totalBoxHFit, 3).fill(GREEN);

    const totalTextY = rowY + padTop;

    doc.fillColor(WHITE)
       .text("TOTAL", cols.precio.x, totalTextY, { width: cols.precio.w, align: "center", lineBreak: false });
    doc.text(fmt(quote.total), cols.subtotal.x, totalTextY, { width: cols.subtotal.w, align: "center", lineBreak: false });

    rowY += totalBoxHFit + 10;

    // ── CONDICIONES ──────────────────────────────────────────────
    const validUntil = new Date(
      new Date(quote.created_at).getTime() + (quote.valid_days || 15) * 86400000
    ).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

    doc.fontSize(8).fillColor(BLACK).font("Helvetica-Bold")
       .text("Condiciones de entrega:", m, rowY);
    rowY += 12;

    doc.fontSize(8).font("Helvetica").fillColor(GRAY);
    doc.text(`Validez: ${quote.valid_days || 15} dias a partir de la fecha de emision (hasta ${validUntil})`, m, rowY);
    rowY += 11;
    doc.text("Tiempo de entrega: 15 dias habiles", m, rowY);
    rowY += 11;
    doc.text("Garantia: Por defectos de fabrica", m, rowY);
    rowY += 18;

    // ── NOTA IMPORTANTE ──────────────────────────────────────────
    const impText =
      "El procesamiento del pedido esta sujeto a la realizacion de un abono equivalente al 50% del valor total cotizado. " +
      "El saldo restante debera ser cancelado una vez se notifique al cliente que el pedido esta listo.";
    const impPadV  = 5;   // padding vertical 5px arriba y abajo
    const impPadW  = 3;   // padding horizontal 3px lados
    const impInnerW = cW - impPadW * 2;
    doc.fontSize(8).font("Helvetica-Bold");
    const impTextH  = doc.heightOfString("IMPORTANTE: " + impText, { width: impInnerW });
    const impBoxH   = impTextH + impPadV * 2;

    doc.rect(m, rowY, cW, impBoxH).fill("#fff8e1");

    const impTextY = rowY + impPadV;
    doc.fontSize(8).fillColor("#7a5800").font("Helvetica-Bold")
       .text("IMPORTANTE: ", m + impPadW, impTextY, { width: impInnerW, continued: true });
    doc.font("Helvetica")
       .text(impText, { width: impInnerW });

    rowY += impBoxH + 6;

    // ── OBSERVACIONES ─────────────────────────────────────────────
    if (quote.notes) {
      doc.fontSize(8).fillColor(GRAY).font("Helvetica")
         .text(`Observaciones: ${quote.notes}`, m, rowY, { width: cW });
      rowY += 20;
    }

    // ── EMITIDO POR ───────────────────────────────────────────────
    doc.fontSize(8).fillColor(BLACK).font("Helvetica-Bold")
       .text("Emitido por: ", m, rowY, { continued: true });
    doc.font("Helvetica").text(quote.created_by_name || "—");
    rowY += 20;

    // ── PIE (flujo normal, siempre en la misma hoja) ──────────────
    doc.moveTo(m, rowY).lineTo(W - m, rowY).lineWidth(0.5).strokeColor(GREEN).stroke();
    rowY += 8;
    doc.fontSize(7.5).fillColor(GRAY).font("Helvetica")
       .text(
         `Tel: ${EMPRESA.tel}   |   Correo: ${quote.created_by_email || ""}   |   ${EMPRESA.web}`,
         m, rowY, { align: "center", width: cW }
       );

    doc.end();
  });
}

/* ─── FACTURA ─────────────────────────────────────────────────── */
export function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 45, size: "A4", autoFirstPage: true });
    const chunks = [];
    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W  = doc.page.width;
    const m  = 45;
    const cW = W - m * 2;

    // ── ENCABEZADO ──────────────────────────────────────────────
    try {
      doc.image(LOGO_PATH, m, m, { height: 55, fit: [120, 55] });
    } catch { /* sin logo */ }

    doc.fontSize(26).fillColor(BLACK).font("Helvetica-Bold")
       .text("FACTURA", m, m + 4, { align: "right", width: cW });

    const numStr = `N° ${order.order_number_fmt || String(order.order_number).padStart(3, "0")}`;
    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text(numStr, m, m + 36, { align: "right", width: cW });

    const fecha = new Date(order.created_at).toLocaleDateString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    doc.fontSize(9).fillColor(GRAY)
       .text(fecha, m, m + 49, { align: "right", width: cW });

    const lineY = m + 70;
    doc.moveTo(m, lineY).lineTo(W - m, lineY).lineWidth(1.5).strokeColor(GREEN).stroke();

    // ── DOS COLUMNAS ─────────────────────────────────────────────
    const colY  = lineY + 14;
    const colW  = cW / 2 - 10;
    const colRX = m + cW / 2 + 10;

    // — Cliente (izquierda) —
    doc.fontSize(8).fillColor(GREEN).font("Helvetica-Bold").text("DATOS DEL CLIENTE", m, colY);
    doc.fontSize(10).fillColor(BLACK).font("Helvetica-Bold").text(order.customer_name || "", m, colY + 13, { width: colW });

    let cliY = colY + 27;
    doc.fontSize(9).fillColor(GRAY).font("Helvetica");
    if (order.document_number) {
      const docLabel = { cedula: "C.C.", nit: "NIT", ce: "C.E.", pp: "PP" }[order.document_type] ?? "C.C.";
      doc.text(`${docLabel} ${order.document_number}`, m, cliY, { width: colW }); cliY += 13;
    }
    if (order.address)        { doc.text(order.address,               m, cliY, { width: colW }); cliY += 13; }
    if (order.city || order.department) {
      const loc = [order.city, order.department].filter(Boolean).join(", ");
      doc.text(loc, m, cliY, { width: colW }); cliY += 13;
    }
    if (order.phone)          { doc.text(fmtPhone(order.phone) || order.phone, m, cliY, { width: colW }); cliY += 13; }
    if (order.customer_email) { doc.text(order.customer_email,        m, cliY, { width: colW }); cliY += 13; }
    if (order.delivery_date)  {
      const dFmt = new Date(order.delivery_date).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bogota" });
      doc.text(`Entrega: ${dFmt}`, m, cliY, { width: colW });
      cliY += 13;
    }

    // — Empresa (derecha) —
    doc.fontSize(8).fillColor(GREEN).font("Helvetica-Bold").text("DATOS DE LA EMPRESA", colRX, colY, { width: colW, align: "right" });
    doc.fontSize(9).fillColor(BLACK).font("Helvetica-Bold").text(EMPRESA.nombre, colRX, colY + 13, { width: colW, align: "right" });

    doc.fontSize(9).fillColor(GRAY).font("Helvetica");
    const empLines = [
      `NIT: 91156614-3`,
      EMPRESA.direccion,
      EMPRESA.ciudad,
      EMPRESA.tel,
      order.created_by_email || null,
      EMPRESA.web,
    ].filter(Boolean);
    let empY = colY + 26;
    empLines.forEach((l) => { doc.text(l, colRX, empY, { width: colW, align: "right" }); empY += 13; });

    // ── TABLA ────────────────────────────────────────────────────
    const tableY = Math.max(cliY, empY) + 18;
    const cols = {
      cant:     { x: m,       w: 40  },
      producto: { x: m + 40,  w: 195 },
      tallas:   { x: m + 235, w: 110 },
      precio:   { x: m + 345, w: 75  },
      subtotal: { x: m + 420, w: 85  },
    };
    const hdrH = 20;

    doc.rect(m, tableY, cW, hdrH).fill(BLACK);
    doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold");
    doc.text("CANT",     cols.cant.x,         tableY + 6, { width: cols.cant.w,     align: "center" });
    doc.text("PRODUCTO", cols.producto.x + 4, tableY + 6, { width: cols.producto.w });
    doc.text("TALLAS",   cols.tallas.x,       tableY + 6, { width: cols.tallas.w,   align: "center" });
    doc.text("P. UNIT",  cols.precio.x,       tableY + 6, { width: cols.precio.w,   align: "center" });
    doc.text("SUBTOTAL", cols.subtotal.x,     tableY + 6, { width: cols.subtotal.w, align: "center" });

    const items = Array.isArray(order.items) ? order.items : [];
    let rowY = tableY + hdrH;

    items.forEach((item, i) => {
      const sizes = (() => { try { return typeof item.sizes === "string" ? JSON.parse(item.sizes) : item.sizes; } catch { return {}; } })();
      const qty      = Object.values(sizes).reduce((a, q) => a + (Number(q) || 0), 0);
      const sizesStr = Object.entries(sizes).filter(([,q]) => q > 0).map(([s,q]) => `${s}:${q}`).join("  ");
      const subtotal = item.subtotal || qty * (item.unit_price || 0);

      const prodLines = doc.heightOfString(item.product_name || "", { width: cols.producto.w - 8, fontSize: 9 });
      const rowH = Math.max(prodLines + 28, 38);
      const midY = rowY + (rowH / 2) - 5;

      if (i % 2 === 0) doc.rect(m, rowY, cW, rowH).fill(LGRAY);
      else              doc.rect(m, rowY, cW, rowH).fill(WHITE);

      doc.fontSize(9).fillColor(BLACK);
      doc.font("Helvetica")
         .text(String(qty), cols.cant.x, midY, { width: cols.cant.w, align: "center" });
      doc.font("Helvetica-Bold")
         .text(item.product_name || "", cols.producto.x + 4, rowY + 10, { width: cols.producto.w - 8 });
      doc.font("Helvetica").fillColor(GRAY)
         .text(item.gender || "", cols.producto.x + 4, rowY + 10 + 13, { width: cols.producto.w - 8 });
      doc.fillColor(BLACK)
         .text(sizesStr,          cols.tallas.x,   midY, { width: cols.tallas.w,   align: "center" });
      doc.text(fmt(item.unit_price), cols.precio.x, midY, { width: cols.precio.w,   align: "center" });
      doc.font("Helvetica-Bold")
         .text(fmt(subtotal),    cols.subtotal.x,  midY, { width: cols.subtotal.w,  align: "center" });

      doc.moveTo(m, rowY + rowH).lineTo(W - m, rowY + rowH).lineWidth(0.3).strokeColor("#dddddd").stroke();
      rowY += rowH;
    });

    doc.rect(m, tableY, cW, rowY - tableY).lineWidth(0.5).strokeColor("#cccccc").stroke();

    // ── BLOQUE INFERIOR: izquierda = historial + emitido | derecha = totales ──
    rowY += 6;
    const totalPaid = (order.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const balance   = Number(order.total || 0) - totalPaid;
    const bloqueY   = rowY; // Y de inicio compartido para ambas columnas

    // — Columna izquierda: historial de abonos + emitido por —
    const leftW = cols.precio.x - m - 10; // ancho disponible antes de los totales
    let leftY = bloqueY;

    if (order.payments?.length) {
      doc.fontSize(8).fillColor(GRAY).font("Helvetica")
         .text("Historial de abonos:", m, leftY, { width: leftW });
      leftY += 12;
      order.payments.forEach((p) => {
        const pDate = new Date(p.paid_at).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bogota" });
        doc.fontSize(8).fillColor(BLACK)
           .text(`- ${pDate}  ${fmt(p.amount)}  (${p.created_by_name || "-"})`, m + 8, leftY, { width: leftW });
        leftY += 12;
      });
      leftY += 4;
    }

    doc.fontSize(8).fillColor(BLACK).font("Helvetica-Bold")
       .text("Emitido por: ", m, leftY, { continued: true, width: leftW });
    doc.font("Helvetica").text(order.created_by_name || "-");
    leftY += 14;

    // — Columna derecha: totales —
    let rightY = bloqueY;

    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text("Total pedido:", cols.precio.x, rightY, { width: cols.precio.w, align: "center" });
    doc.fillColor(BLACK).font("Helvetica-Bold")
       .text(fmt(order.total), cols.subtotal.x, rightY, { width: cols.subtotal.w, align: "center" });
    rightY += 14;

    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text("Total abonado:", cols.precio.x, rightY, { width: cols.precio.w, align: "center" });
    doc.fillColor(GREEN).font("Helvetica-Bold")
       .text(fmt(totalPaid), cols.subtotal.x, rightY, { width: cols.subtotal.w, align: "center" });
    rightY += 14;

    const saldoBoxW = cols.precio.w + cols.subtotal.w;
    doc.fontSize(9).font("Helvetica-Bold");
    const saldoBoxH = doc.currentLineHeight(true) + 10;
    doc.roundedRect(cols.precio.x, rightY, saldoBoxW, saldoBoxH, 3).fill("#ef4444");
    const saldoTextY = rightY + 5;
    doc.fillColor(WHITE)
       .text("Saldo pendiente:", cols.precio.x, saldoTextY, { width: saldoBoxW / 2, align: "center", lineBreak: false });
    doc.text(fmt(balance <= 0 ? 0 : balance), cols.precio.x + saldoBoxW / 2, saldoTextY, { width: saldoBoxW / 2, align: "center", lineBreak: false });
    rightY += saldoBoxH + 6;

    // rowY avanza al final del bloque más alto
    rowY = Math.max(leftY, rightY) + 10;

    // ── PIE (flujo normal, igual que cotización) ──────────────────
    doc.moveTo(m, rowY).lineTo(W - m, rowY).lineWidth(0.5).strokeColor(GREEN).stroke();
    rowY += 8;
    doc.fontSize(7.5).fillColor(GRAY).font("Helvetica")
       .text(
         `${EMPRESA.tel}   |   ${order.created_by_email || ""}   |   ${EMPRESA.web}`,
         m, rowY, { align: "center", width: cW }
       );

    doc.end();
  });
}
