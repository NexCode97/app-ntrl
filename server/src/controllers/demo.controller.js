/**
 * Controlador para seed/cleanup del entorno demo.
 * Protegido por DEMO_SECRET en variables de entorno.
 */

import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";

const DEMO_EMAILS = [
  "demo@appntrl.com",
  "vendedor@appntrl.com",
  "trabajador@appntrl.com",
];

const DEMO_DOCUMENTS = [
  "900100200-1",
  "900200300-2",
  "1020304050",
  "900400500-3",
];

function checkSecret(req, res) {
  const secret = process.env.DEMO_SECRET;
  if (!secret || req.headers["x-demo-secret"] !== secret) {
    res.status(403).json({ status: "error", message: "Acceso denegado." });
    return false;
  }
  return true;
}

export async function seedDemo(req, res) {
  if (!checkSecret(req, res)) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verificar que no existan ya
    const existing = await client.query(
      "SELECT email FROM users WHERE email = ANY($1)",
      [DEMO_EMAILS]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Ya existen datos demo. Ejecuta cleanup primero.",
      });
    }

    const passwordHash = await bcrypt.hash("Demo2024", 10);

    // IDs fijos (UUID v4 válidos) para poder referenciarlos entre tablas
    const adminId    = "a0a0a0a0-1111-4000-8000-000000000001";
    const vendedorId = "a0a0a0a0-1111-4000-8000-000000000002";
    const workerId   = "a0a0a0a0-1111-4000-8000-000000000003";

    const custIds = [
      "c0c0c0c0-2222-4000-8000-000000000001",
      "c0c0c0c0-2222-4000-8000-000000000002",
      "c0c0c0c0-2222-4000-8000-000000000003",
      "c0c0c0c0-2222-4000-8000-000000000004",
    ];

    // 1. Usuarios
    const users = [
      { id: adminId,    name: "Demo Admin",      email: "demo@appntrl.com",         role: "admin",    area: null },
      { id: vendedorId, name: "Demo Vendedor",   email: "vendedor@appntrl.com",     role: "vendedor", area: null },
      { id: workerId,   name: "Demo Trabajador", email: "trabajador@appntrl.com",   role: "worker",   area: "ensamble" },
    ];
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, name, email, role, area, password_hash, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,true)`,
        [u.id, u.name, u.email, u.role, u.area, passwordHash]
      );
    }

    // 2. Clientes
    const customers = [
      { id: custIds[0], name: "Club Deportivo Halcones",    doc_type: "nit",    doc_num: "900100200-1", company: true,  phone: "3201234567" },
      { id: custIds[1], name: "Escuela de Futbol Titanes",  doc_type: "nit",    doc_num: "900200300-2", company: true,  phone: "3109876543" },
      { id: custIds[2], name: "Carlos Rodriguez",           doc_type: "cedula", doc_num: "1020304050",  company: false, phone: "3154445566" },
      { id: custIds[3], name: "Liga de Ciclismo del Valle", doc_type: "nit",    doc_num: "900400500-3", company: true,  phone: "3167778899" },
    ];
    for (const c of customers) {
      await client.query(
        `INSERT INTO customers (id, name, document_type, document_number, is_company, phone, city, department)
         VALUES ($1,$2,$3,$4,$5,$6,'Demo','Demo')
         ON CONFLICT (document_number) DO NOTHING`,
        [c.id, c.name, c.doc_type, c.doc_num, c.company, c.phone]
      );
    }

    // 3. Obtener productos del catálogo
    const { rows: products } = await client.query(
      `SELECT p.id FROM products p WHERE p.is_active = true LIMIT 10`
    );
    if (!products.length) throw new Error("No hay productos en el catálogo.");
    const pids = products.map(p => p.id);

    // 4. Pedidos
    const ordersData = [
      { cust: custIds[0], creator: adminId,    status: "pending",     delivery: "2026-05-15", items: [[pids[0], 55000], [pids[1], 65000]], paid: 0,       desc: "Uniformes completos temporada 2026. Incluye camiseta y pantaloneta." },
      { cust: custIds[1], creator: vendedorId, status: "pending",     delivery: "2026-05-20", items: [[pids[2], 75000]],                   paid: 0,       desc: "Pedido urgente para torneo. Revisar tallas antes de corte." },
      { cust: custIds[2], creator: vendedorId, status: "in_progress", delivery: "2026-05-05", items: [[pids[0], 80000], [pids[3], 60000]], paid: 300000,  desc: "Conjunto deportivo personalizado con nombre y numero." },
      { cust: custIds[3], creator: adminId,    status: "in_progress", delivery: "2026-05-08", items: [[pids[1], 90000], [pids[2], 55000], [pids[4]||pids[0], 70000]], paid: 500000, desc: "Dotacion para 20 ciclistas. Logo en pecho izquierdo." },
      { cust: custIds[0], creator: vendedorId, status: "in_progress", delivery: "2026-04-28", items: [[pids[0], 65000], [pids[2], 75000]], paid: 800000,  desc: "Segunda orden de la temporada. Mismo diseno que pedido anterior." },
      { cust: custIds[1], creator: adminId,    status: "completed",   delivery: "2026-04-20", items: [[pids[1], 80000], [pids[3]||pids[0], 65000]], paid: 1200000, desc: "Uniformes para categoria sub-15 y sub-17." },
      { cust: custIds[2], creator: vendedorId, status: "completed",   delivery: "2026-04-18", items: [[pids[0], 90000]],                   paid: 400000,  desc: "Pedido personal. Tallas validadas por el cliente." },
      { cust: custIds[3], creator: adminId,    status: "delivered",   delivery: "2026-04-10", items: [[pids[1], 120000], [pids[2], 80000]], paid: 1800000, desc: "Entregado en sede de la liga. Recibido por coordinador deportivo." },
    ];

    for (const cfg of ordersData) {
      const { rows: [ord] } = await client.query(
        `INSERT INTO orders (customer_id, created_by, delivery_date, description, status)
         VALUES ($1,$2,$3,$4,'pending') RETURNING id`,
        [cfg.cust, cfg.creator, cfg.delivery, cfg.desc]
      );
      const orderId = ord.id;

      for (const [pid, price] of cfg.items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, gender, sizes, unit_price)
           VALUES ($1,$2,'hombre',$3,$4)`,
          [orderId, pid, JSON.stringify({ TS: 5, TM: 8, TL: 6, TXL: 3 }), price]
        );
      }

      if (cfg.status === "in_progress") {
        await client.query(
          `UPDATE production_tasks SET status='in_progress', started_at=NOW(), started_by=$2
           WHERE order_id=$1 AND area IN ('corte','diseno_disenar')`,
          [orderId, adminId]
        );
      } else if (cfg.status === "completed") {
        await client.query(
          `UPDATE production_tasks SET status='done', completed_at=NOW(), completed_by=$2 WHERE order_id=$1`,
          [orderId, adminId]
        );
        await client.query(`UPDATE orders SET status='completed' WHERE id=$1`, [orderId]);
      } else if (cfg.status === "delivered") {
        await client.query(
          `UPDATE production_tasks SET status='done', completed_at=NOW(), completed_by=$2 WHERE order_id=$1`,
          [orderId, adminId]
        );
        await client.query(`UPDATE orders SET status='delivered' WHERE id=$1`, [orderId]);
      }

      if (cfg.paid > 0) {
        await client.query(
          `INSERT INTO order_payments (order_id, payment_number, amount, method, bank, created_by)
           VALUES ($1,1,$2,'transferencia','Bancolombia',$3)`,
          [orderId, cfg.paid, cfg.creator]
        );
      }
    }

    // 5. Mensajes
    const msgs = [
      { from: adminId,    to: vendedorId, content: "Buenos dias. Ya tenemos listos los pedidos de Halcones para revision." },
      { from: vendedorId, to: adminId,    content: "Perfecto, los reviso hoy en la tarde y confirmo con el cliente." },
      { from: adminId,    to: vendedorId, content: "El cliente de Titanes pregunto si podemos adelantar la entrega al 18." },
      { from: vendedorId, to: adminId,    content: "Voy a verificar con produccion y te confirmo." },
      { from: adminId,    to: vendedorId, content: "Recuerda que el pedido #3 tiene abono pendiente por confirmar." },
      { from: vendedorId, to: adminId,    content: "Listo, ya le envie el link de pago al cliente." },
      { from: adminId,    to: workerId,   content: "El pedido de ciclismo entra a corte hoy. Son 20 unidades." },
      { from: workerId,   to: adminId,    content: "Entendido, ya lo tengo en el area. Empezamos en la manana." },
      { from: adminId,    to: workerId,   content: "Como va el ensamble del pedido de Halcones?" },
      { from: workerId,   to: adminId,    content: "Ya llevamos el 70%. Terminamos manana en la manana." },
      { from: vendedorId, to: workerId,   content: "Hola, puedes revisar las tallas del pedido sub-15 de Titanes?" },
      { from: workerId,   to: vendedorId, content: "Si, las tengo anotadas. Todo coincide con la orden." },
      { from: vendedorId, to: workerId,   content: "El cliente quiere agregar 3 unidades talla TXL. Hay material?" },
      { from: workerId,   to: vendedorId, content: "Si hay tela. Puedo incluirlas sin problema." },
    ];
    for (const m of msgs) {
      await client.query(
        `INSERT INTO messages (from_user_id, to_user_id, content, is_read) VALUES ($1,$2,$3,true)`,
        [m.from, m.to, m.content]
      );
    }

    await client.query("COMMIT");
    res.json({
      status: "ok",
      message: "Datos demo creados correctamente.",
      credentials: {
        admin:      { email: "demo@appntrl.com",         password: "Demo2024" },
        vendedor:   { email: "vendedor@appntrl.com",     password: "Demo2024" },
        trabajador: { email: "trabajador@appntrl.com",   password: "Demo2024" },
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ status: "error", message: err.message });
  } finally {
    client.release();
  }
}

export async function cleanupDemo(req, res) {
  if (!checkSecret(req, res)) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: users } = await client.query(
      "SELECT id FROM users WHERE email = ANY($1)", [DEMO_EMAILS]
    );
    const userIds = users.map(u => u.id);

    if (!userIds.length) {
      return res.json({ status: "ok", message: "No habia datos demo que limpiar." });
    }

    const { rows: orders } = await client.query(
      "SELECT id FROM orders WHERE created_by = ANY($1)", [userIds]
    );
    if (orders.length) {
      await client.query("DELETE FROM orders WHERE id = ANY($1)", [orders.map(o => o.id)]);
    }

    await client.query("DELETE FROM messages WHERE from_user_id = ANY($1) OR to_user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM notifications WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM push_subscriptions WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM sessions WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM customers WHERE document_number = ANY($1)", [DEMO_DOCUMENTS]);
    await client.query("DELETE FROM users WHERE email = ANY($1)", [DEMO_EMAILS]);

    await client.query("COMMIT");
    res.json({ status: "ok", message: "Datos demo eliminados correctamente." });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ status: "error", message: err.message });
  } finally {
    client.release();
  }
}
