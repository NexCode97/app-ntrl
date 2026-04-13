/**
 * Limpia todos los datos demo de APP NTRL
 *
 * Uso:
 *   cd server
 *   node --env-file=.env scripts/cleanup-demo.js
 */

import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Obtener IDs de usuarios demo
    const { rows: users } = await client.query(
      "SELECT id FROM users WHERE email = ANY($1)",
      [DEMO_EMAILS]
    );
    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
      console.log("ℹ️  No se encontraron datos demo. Nada que limpiar.");
      process.exit(0);
    }

    // Obtener pedidos creados por usuarios demo
    const { rows: orders } = await client.query(
      "SELECT id FROM orders WHERE created_by = ANY($1)",
      [userIds]
    );
    const orderIds = orders.map(o => o.id);
    console.log(`Eliminando ${orderIds.length} pedidos demo...`);

    // Eliminar pedidos (cascade elimina items, pagos, tareas, historial)
    if (orderIds.length > 0) {
      await client.query("DELETE FROM orders WHERE id = ANY($1)", [orderIds]);
    }

    // Eliminar mensajes
    const { rowCount: msgs } = await client.query(
      "DELETE FROM messages WHERE from_user_id = ANY($1) OR to_user_id = ANY($1)",
      [userIds]
    );
    console.log(`Eliminando ${msgs} mensajes demo...`);

    // Eliminar notificaciones
    await client.query(
      "DELETE FROM notifications WHERE user_id = ANY($1)",
      [userIds]
    );

    // Eliminar suscripciones push
    await client.query(
      "DELETE FROM push_subscriptions WHERE user_id = ANY($1)",
      [userIds]
    );

    // Eliminar sesiones
    await client.query(
      "DELETE FROM sessions WHERE user_id = ANY($1)",
      [userIds]
    );

    // Eliminar clientes demo
    const { rowCount: customers } = await client.query(
      "DELETE FROM customers WHERE document_number = ANY($1)",
      [DEMO_DOCUMENTS]
    );
    console.log(`Eliminando ${customers} clientes demo...`);

    // Eliminar usuarios demo
    const { rowCount: deletedUsers } = await client.query(
      "DELETE FROM users WHERE email = ANY($1)",
      [DEMO_EMAILS]
    );
    console.log(`Eliminando ${deletedUsers} usuarios demo...`);

    await client.query("COMMIT");
    console.log("\n✅ Datos demo eliminados correctamente.");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error al limpiar:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
