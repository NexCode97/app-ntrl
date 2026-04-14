import PDFDocument from "pdfkit";

const GREEN  = "#22c55e";
const BLACK  = "#000000";
const GRAY   = "#71717a";
const LIGHT  = "#f4f4f5";
const WHITE  = "#ffffff";

function fmt(n) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`;
}

/* ─── COTIZACIÓN ──────────────────────────────────────────────── */
export function generateQuotePDF(quote) {
  return new Promise((resolve, reject) => {
    const doc  = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const margin = 50;
    const contentW = pageW - margin * 2;

    // ── Encabezado ──
    doc.rect(0, 0, pageW, 100).fill(BLACK);
    doc.fontSize(28).fillColor(GREEN).font("Helvetica-Bold").text("NTRL", margin, 30);
    doc.fontSize(10).fillColor(WHITE).font("Helvetica").text("Natural Ropa Deportiva", margin, 62);

    doc.fontSize(20).fillColor(WHITE).font("Helvetica-Bold")
       .text("COTIZACIÓN", margin, 30, { align: "right" });
    doc.fontSize(10).fillColor(GREEN).font("Helvetica")
       .text(`N° ${String(quote.quote_number).padStart(4, "0")}`, margin, 58, { align: "right" });

    doc.moveDown(4);

    // ── Info cotización ──
    const infoY = 120;
    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text("FECHA", margin, infoY)
       .text("VÁLIDA HASTA", 200, infoY)
       .text("ESTADO", 360, infoY);

    const fecha   = new Date(quote.created_at).toLocaleDateString("es-CO");
    const validUntil = new Date(new Date(quote.created_at).getTime() + quote.valid_days * 86400000).toLocaleDateString("es-CO");

    doc.fontSize(10).fillColor(BLACK).font("Helvetica-Bold")
       .text(fecha, margin, infoY + 14)
       .text(validUntil, 200, infoY + 14)
       .text(quote.status.toUpperCase(), 360, infoY + 14);

    // ── Datos cliente ──
    const clientY = 175;
    doc.rect(margin, clientY, contentW, 70).fill(LIGHT);
    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text("CLIENTE", margin + 10, clientY + 10);
    doc.fontSize(11).fillColor(BLACK).font("Helvetica-Bold")
       .text(quote.customer_name, margin + 10, clientY + 24);
    doc.fontSize(9).fillColor(GRAY).font("Helvetica");
    if (quote.customer_email) doc.text(`✉  ${quote.customer_email}`, margin + 10, clientY + 42);
    if (quote.customer_phone) doc.text(`📞  ${quote.customer_phone}`, 280, clientY + 42);

    // ── Tabla de items ──
    let y = clientY + 90;

    // Cabecera tabla
    doc.rect(margin, y, contentW, 22).fill(BLACK);
    doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold");
    doc.text("PRODUCTO",    margin + 8,       y + 7);
    doc.text("GÉNERO",      margin + 170,     y + 7);
    doc.text("TALLAS/CANT", margin + 240,     y + 7);
    doc.text("P. UNIT",     margin + 360,     y + 7);
    doc.text("SUBTOTAL",    margin + 430,     y + 7);

    y += 22;

    const items = Array.isArray(quote.items) ? quote.items : [];
    items.forEach((item, i) => {
      const rowH = 36;
      if (i % 2 === 0) doc.rect(margin, y, contentW, rowH).fill(LIGHT);

      // Tallas
      const sizesStr = Object.entries(item.sizes || {})
        .filter(([, qty]) => qty > 0)
        .map(([s, q]) => `${s}:${q}`)
        .join("  ");

      doc.fontSize(9).fillColor(BLACK).font("Helvetica-Bold")
         .text(item.product_name || "", margin + 8, y + 5, { width: 155, ellipsis: true });
      doc.font("Helvetica").fillColor(GRAY)
         .text(item.gender || "", margin + 170, y + 5)
         .text(sizesStr, margin + 240, y + 5, { width: 110 })
         .fillColor(BLACK)
         .text(fmt(item.unit_price), margin + 360, y + 5)
         .font("Helvetica-Bold")
         .text(fmt(item.subtotal), margin + 430, y + 5);

      y += rowH;
    });

    // ── Totales ──
    y += 10;
    doc.moveTo(margin, y).lineTo(pageW - margin, y).stroke(LIGHT);
    y += 10;

    const totalBoxX = margin + contentW - 180;
    doc.rect(totalBoxX, y, 180, 40).fill(GREEN);
    doc.fontSize(10).fillColor(WHITE).font("Helvetica")
       .text("TOTAL", totalBoxX + 12, y + 8);
    doc.fontSize(14).font("Helvetica-Bold")
       .text(fmt(quote.total), totalBoxX + 12, y + 22);

    // ── Notas ──
    if (quote.notes) {
      y += 60;
      doc.fontSize(9).fillColor(GRAY).font("Helvetica").text("OBSERVACIONES:", margin, y);
      doc.fontSize(9).fillColor(BLACK).text(quote.notes, margin, y + 14, { width: contentW });
    }

    // ── Pie ──
    const pageH = doc.page.height;
    doc.rect(0, pageH - 45, pageW, 45).fill(BLACK);
    doc.fontSize(8).fillColor(GRAY).font("Helvetica")
       .text("Esta cotización es válida por el período indicado. Precios sujetos a cambio sin previo aviso.", margin, pageH - 30, { align: "center", width: contentW });

    doc.end();
  });
}

/* ─── FACTURA ─────────────────────────────────────────────────── */
export function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    const doc  = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const margin = 50;
    const contentW = pageW - margin * 2;

    // ── Encabezado ──
    doc.rect(0, 0, pageW, 100).fill(BLACK);
    doc.fontSize(28).fillColor(GREEN).font("Helvetica-Bold").text("NTRL", margin, 30);
    doc.fontSize(10).fillColor(WHITE).font("Helvetica").text("Natural Ropa Deportiva", margin, 62);

    doc.fontSize(20).fillColor(WHITE).font("Helvetica-Bold")
       .text("FACTURA", margin, 30, { align: "right" });
    doc.fontSize(10).fillColor(GREEN).font("Helvetica")
       .text(`N° ${order.order_number_fmt || String(order.order_number).padStart(3, "0")}`, margin, 58, { align: "right" });

    // ── Info pedido ──
    const infoY = 120;
    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text("FECHA PEDIDO",    margin,  infoY)
       .text("FECHA ENTREGA",   200,     infoY)
       .text("ESTADO",          360,     infoY);

    doc.fontSize(10).fillColor(BLACK).font("Helvetica-Bold")
       .text(new Date(order.created_at).toLocaleDateString("es-CO"), margin, infoY + 14)
       .text(order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("es-CO") : "—", 200, infoY + 14)
       .text((order.status || "").toUpperCase(), 360, infoY + 14);

    // ── Datos cliente ──
    const clientY = 175;
    doc.rect(margin, clientY, contentW, 70).fill(LIGHT);
    doc.fontSize(9).fillColor(GRAY).font("Helvetica").text("CLIENTE", margin + 10, clientY + 10);
    doc.fontSize(11).fillColor(BLACK).font("Helvetica-Bold").text(order.customer_name, margin + 10, clientY + 24);
    doc.fontSize(9).fillColor(GRAY).font("Helvetica");
    if (order.customer_email) doc.text(`✉  ${order.customer_email}`, margin + 10, clientY + 42);
    if (order.phone)          doc.text(`📞  ${order.phone}`,         280, clientY + 42);

    // ── Tabla de items ──
    let y = clientY + 90;
    doc.rect(margin, y, contentW, 22).fill(BLACK);
    doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold");
    doc.text("PRODUCTO",    margin + 8,   y + 7);
    doc.text("GÉNERO",      margin + 170, y + 7);
    doc.text("TALLAS/CANT", margin + 240, y + 7);
    doc.text("P. UNIT",     margin + 360, y + 7);
    doc.text("SUBTOTAL",    margin + 430, y + 7);
    y += 22;

    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((item, i) => {
      const rowH = 36;
      if (i % 2 === 0) doc.rect(margin, y, contentW, rowH).fill(LIGHT);

      const sizes = (() => {
        try { return typeof item.sizes === "string" ? JSON.parse(item.sizes) : item.sizes; }
        catch { return {}; }
      })();
      const sizesStr = Object.entries(sizes || {})
        .filter(([, q]) => q > 0).map(([s, q]) => `${s}:${q}`).join("  ");

      doc.fontSize(9).fillColor(BLACK).font("Helvetica-Bold")
         .text(item.product_name || "", margin + 8, y + 5, { width: 155, ellipsis: true });
      doc.font("Helvetica").fillColor(GRAY)
         .text(item.gender || "", margin + 170, y + 5)
         .text(sizesStr, margin + 240, y + 5, { width: 110 })
         .fillColor(BLACK)
         .text(fmt(item.unit_price), margin + 360, y + 5)
         .font("Helvetica-Bold")
         .text(fmt(item.subtotal), margin + 430, y + 5);

      y += rowH;
    });

    // ── Resumen financiero ──
    y += 10;
    doc.moveTo(margin, y).lineTo(pageW - margin, y).stroke(LIGHT);
    y += 16;

    const boxX = margin + contentW - 200;
    const totalPaid = (order.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const balance   = Number(order.total || 0) - totalPaid;

    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text("Total pedido:",  boxX, y).fillColor(BLACK).font("Helvetica-Bold")
       .text(fmt(order.total), boxX + 120, y, { align: "right", width: 80 });
    y += 16;
    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text("Total abonado:", boxX, y).fillColor(GREEN).font("Helvetica-Bold")
       .text(fmt(totalPaid), boxX + 120, y, { align: "right", width: 80 });
    y += 16;

    doc.rect(boxX - 8, y - 4, 200, 28).fill(balance <= 0 ? GREEN : "#ef4444");
    doc.fontSize(10).fillColor(WHITE).font("Helvetica")
       .text("Saldo pendiente:", boxX, y + 6);
    doc.font("Helvetica-Bold")
       .text(fmt(balance <= 0 ? 0 : balance), boxX + 120, y + 6, { align: "right", width: 80 });

    // ── Abonos ──
    if (order.payments?.length) {
      y += 50;
      doc.fontSize(9).fillColor(GRAY).font("Helvetica").text("HISTORIAL DE ABONOS:", margin, y);
      y += 14;
      order.payments.forEach((p) => {
        doc.fontSize(9).fillColor(BLACK).font("Helvetica")
           .text(`• ${new Date(p.created_at).toLocaleDateString("es-CO")}  —  ${fmt(p.amount)}  (${p.created_by_name || "—"})`, margin + 8, y);
        y += 14;
      });
    }

    // ── Notas ──
    if (order.description) {
      y += 10;
      doc.fontSize(9).fillColor(GRAY).font("Helvetica").text("DESCRIPCIÓN:", margin, y);
      doc.fontSize(9).fillColor(BLACK).text(order.description, margin, y + 14, { width: contentW });
    }

    // ── Creado por ──
    y += 50;
    if (order.created_by_name) {
      doc.fontSize(8).fillColor(GRAY).font("Helvetica")
         .text(`Generado por: ${order.created_by_name}`, margin, y, { align: "right", width: contentW });
    }

    // ── Pie ──
    const pageH = doc.page.height;
    doc.rect(0, pageH - 45, pageW, 45).fill(BLACK);
    doc.fontSize(8).fillColor(GRAY).font("Helvetica")
       .text("Documento interno — Natural Ropa Deportiva", margin, pageH - 30, { align: "center", width: contentW });

    doc.end();
  });
}
