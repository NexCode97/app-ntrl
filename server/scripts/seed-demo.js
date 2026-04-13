/**
 * Seed de datos demo para APP NTRL
 * Crea usuarios, clientes, pedidos, pagos y mensajes de prueba.
 *
 * Uso:
 *   cd server
 *   node --env-file=.env scripts/seed-demo.js
 */

import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Helpers ────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

async function hash(password) {
  return bcrypt.hash(password, 10);
}

// ─── Datos demo ─────────────────────────────────────────────────────────────

const DEMO_PASSWORD = "Demo2024";

const DEMO_USERS = [
  { id: uuid(), name: "Demo Admin",      email: "demo@appntrl.com",       role: "admin",   area: null },
  { id: uuid(), name: "Demo Vendedor",   email: "vendedor@appntrl.com",   role: "vendedor", area: null },
  { id: uuid(), name: "Demo Trabajador", email: "trabajador@appntrl.com", role: "worker",  area: "ensamble" },
];

const DEMO_CUSTOMERS = [
  { id: uuid(), name: "Club Deportivo Halcones",   document_type: "nit",    document_number: "900100200-1", is_company: true,  phone: "3201234567", city: "Bogotá" },
  { id: uuid(), name: "Escuela de Fútbol Titanes", document_type: "nit",    document_number: "900200300-2", is_company: true,  phone: "3109876543", city: "Medellín" },
  { id: uuid(), name: "Carlos Rodríguez",          document_type: "cedula", document_number: "1020304050",  is_company: false, phone: "3154445566", city: "Cali" },
  { id: uuid(), name: "Liga de Ciclismo del Valle", document_type: "nit",   document_number: "900400500-3", is_company: true,  phone: "3167778899", city: "Cali" },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Verificar que no existan ya los usuarios demo
    const existing = await client.query(
      "SELECT email FROM users WHERE email = ANY($1)",
      [DEMO_USERS.map(u => u.email)]
    );
    if (existing.rows.length > 0) {
      console.log("⚠️  Ya existen usuarios demo. Ejecuta cleanup-demo.js primero.");
      process.exit(1);
    }

    // 2. Crear usuarios demo
    console.log("Creando usuarios demo...");
    const passwordHash = await hash(DEMO_PASSWORD);
    for (const u of DEMO_USERS) {
      await client.query(
        `INSERT INTO users (id, name, email, role, area, password_hash, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,true)`,
        [u.id, u.name, u.email, u.role, u.area, passwordHash]
      );
      console.log(`  ✓ ${u.role}: ${u.email}`);
    }

    const [adminUser, vendedorUser] = DEMO_USERS;

    // 3. Crear clientes demo
    console.log("\nCreando clientes demo...");
    for (const c of DEMO_CUSTOMERS) {
      await client.query(
        `INSERT INTO customers (id, name, document_type, document_number, is_company, phone, city, department)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (document_number) DO NOTHING`,
        [c.id, c.name, c.document_type, c.document_number, c.is_company, c.phone, c.city, "Demo"]
      );
      console.log(`  ✓ ${c.name}`);
    }

    // 4. Obtener productos del catálogo
    const { rows: products } = await client.query(
      `SELECT p.id, p.name FROM products p
       JOIN lines l ON l.id = p.line_id
       WHERE p.is_active = true LIMIT 10`
    );

    if (products.length === 0) {
      throw new Error("No hay productos en el catálogo. Ejecuta las migraciones de datos primero.");
    }

    // 5. Crear 8 pedidos en distintos estados
    console.log("\nCreando pedidos demo...");

    const ordersConfig = [
      { customer: DEMO_CUSTOMERS[0], status: "pending",     delivery: "2026-05-15", creator: adminUser,    items: 2, paid: 0,       desc: "Uniformes completos para temporada 2026. Incluye camiseta y pantaloneta." },
      { customer: DEMO_CUSTOMERS[1], status: "pending",     delivery: "2026-05-20", creator: vendedorUser, items: 1, paid: 0,       desc: "Pedido urgente para torneo. Revisar tallas antes de corte." },
      { customer: DEMO_CUSTOMERS[2], status: "in_progress", delivery: "2026-05-05", creator: vendedorUser, items: 2, paid: 300000,  desc: "Conjunto deportivo personalizado con nombre y número." },
      { customer: DEMO_CUSTOMERS[3], status: "in_progress", delivery: "2026-05-08", creator: adminUser,    items: 3, paid: 500000,  desc: "Dotación para 20 ciclistas. Logo de la liga en pecho izquierdo." },
      { customer: DEMO_CUSTOMERS[0], status: "in_progress", delivery: "2026-04-28", creator: vendedorUser, items: 2, paid: 800000,  desc: "Segunda orden de la temporada. Mismo diseño que pedido anterior." },
      { customer: DEMO_CUSTOMERS[1], status: "completed",   delivery: "2026-04-20", creator: adminUser,    items: 2, paid: 1200000, desc: "Uniformes para categoría sub-15 y sub-17." },
      { customer: DEMO_CUSTOMERS[2], status: "completed",   delivery: "2026-04-18", creator: vendedorUser, items: 1, paid: 400000,  desc: "Pedido personal. Tallas validadas por el cliente." },
      { customer: DEMO_CUSTOMERS[3], status: "delivered",   delivery: "2026-04-10", creator: adminUser,    items: 2, paid: 1800000, desc: "Entregado en sede de la liga. Recibido por coordinador deportivo." },
    ];

    const createdOrders = [];

    for (const cfg of ordersConfig) {
      const orderId = uuid();

      // Insertar pedido (sin total — lo calcula el trigger con los items)
      await client.query(
        `INSERT INTO orders (id, customer_id, created_by, delivery_date, description, status)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, cfg.customer.id, cfg.creator.id, cfg.delivery, cfg.desc, "pending"]
      );

      // Insertar items con precios realistas
      const usedProducts = products.slice(0, cfg.items);
      for (const prod of usedProducts) {
        const unitPrice = [55000, 65000, 75000, 80000, 90000, 120000][Math.floor(Math.random() * 6)];
        await client.query(
          `INSERT INTO order_items (order_id, product_id, gender, sizes, unit_price)
           VALUES ($1,$2,$3,$4,$5)`,
          [orderId, prod.id, "hombre", JSON.stringify({ TS: 5, TM: 8, TL: 6, TXL: 3 }), unitPrice]
        );
      }

      // Forzar estado correcto (el trigger de produccion lo pone en pending por defecto)
      if (cfg.status === "in_progress") {
        await client.query(
          `UPDATE production_tasks SET status = 'in_progress', started_at = NOW(), started_by = $2
           WHERE order_id = $1 AND area IN ('corte', 'diseno_disenar')`,
          [orderId, adminUser.id]
        );
      } else if (cfg.status === "completed") {
        await client.query(
          `UPDATE production_tasks SET status = 'done', completed_at = NOW(), completed_by = $2
           WHERE order_id = $1`,
          [orderId, adminUser.id]
        );
        await client.query(
          `UPDATE orders SET status = 'completed' WHERE id = $1`, [orderId]
        );
      } else if (cfg.status === "delivered") {
        await client.query(
          `UPDATE production_tasks SET status = 'done', completed_at = NOW(), completed_by = $2
           WHERE order_id = $1`,
          [orderId, adminUser.id]
        );
        await client.query(
          `UPDATE orders SET status = 'delivered' WHERE id = $1`, [orderId]
        );
      }

      // Insertar abono si aplica
      if (cfg.paid > 0) {
        await client.query(
          `INSERT INTO order_payments (order_id, payment_number, amount, method, bank, created_by)
           VALUES ($1, 1, $2, 'transferencia', 'Bancolombia', $3)`,
          [orderId, cfg.paid, cfg.creator.id]
        );
      }

      createdOrders.push(orderId);
      const { rows: [ord] } = await client.query("SELECT order_number, total FROM orders WHERE id = $1", [orderId]);
      console.log(`  ✓ Pedido #${ord.order_number} — ${cfg.status} — Total: $${Number(ord.total).toLocaleString("es-CO")}`);
    }

    // 6. Crear mensajes de ejemplo entre los 3 usuarios
    console.log("\nCreando mensajes demo...");

    const [admin, vendedor, worker] = DEMO_USERS;

    const conversations = [
      // Admin ↔ Vendedor
      { from: admin,    to: vendedor, content: "Buenos días. Ya tenemos listos los pedidos de Halcones para revisión." },
      { from: vendedor, to: admin,    content: "Perfecto, los reviso hoy en la tarde y confirmo con el cliente." },
      { from: admin,    to: vendedor, content: "El cliente de Titanes preguntó si podemos adelantar la entrega al 18." },
      { from: vendedor, to: admin,    content: "Voy a verificar con producción y te confirmo." },
      { from: admin,    to: vendedor, content: "Recuerda que el pedido #3 tiene abono pendiente por confirmar." },
      { from: vendedor, to: admin,    content: "Listo, ya le envié el link de pago al cliente." },

      // Admin ↔ Worker
      { from: admin,  to: worker, content: "El pedido de ciclismo entra a corte hoy. Son 20 unidades." },
      { from: worker, to: admin,  content: "Entendido, ya lo tengo en el área. Empezamos en la mañana." },
      { from: admin,  to: worker, content: "¿Cómo va el ensamble del pedido de Halcones?" },
      { from: worker, to: admin,  content: "Ya llevamos el 70%. Terminamos mañana en la mañana." },

      // Vendedor ↔ Worker
      { from: vendedor, to: worker, content: "Hola, ¿puedes revisar las tallas del pedido sub-15 de Titanes?" },
      { from: worker,   to: vendedor, content: "Sí, las tengo anotadas. Todo coincide con la orden." },
      { from: vendedor, to: worker,   content: "El cliente quiere agregar 3 unidades talla TXL. ¿Hay material?" },
      { from: worker,   to: vendedor, content: "Sí hay tela. Puedo incluirlas sin problema." },
    ];

    for (const msg of conversations) {
      await client.query(
        `INSERT INTO messages (from_user_id, to_user_id, content, is_read)
         VALUES ($1,$2,$3,true)`,
        [msg.from.id, msg.to.id, msg.content]
      );
    }
    console.log(`  ✓ ${conversations.length} mensajes creados`);

    await client.query("COMMIT");

    console.log("\n✅ Seed demo completado exitosamente.");
    console.log("\nCredenciales:");
    console.log("  Admin:      demo@appntrl.com     / Demo2024");
    console.log("  Vendedor:   vendedor@appntrl.com / Demo2024");
    console.log("  Trabajador: trabajador@appntrl.com / Demo2024");
    console.log("\nPara limpiar: node --env-file=.env scripts/cleanup-demo.js");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error en seed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
