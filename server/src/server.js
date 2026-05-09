import "dotenv/config";
import http from "http";
import app from "./app.js";
import { config } from "./config/index.js";
import { testConnection } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { runMigrations } from "./utils/runMigrations.js";

// Capturar errores no manejados para evitar que el proceso muera
process.on("uncaughtException", (err) => {
  console.error("uncaughtException (proceso continúa):", err.message, err.stack);
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection (proceso continúa):", reason);
});

async function ensureOrderNameColumn() {
  try {
    const { pool } = await import("./config/database.js");
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
    console.log("✓ Columna orders.name verificada/creada.");
  } catch (err) {
    console.warn("⚠ No se pudo verificar columna orders.name:", err.message);
  }
}

function toTitleCaseEs(str) {
  if (!str) return str;
  const LOWERCASE_WORDS = new Set([
    "de", "del", "la", "las", "el", "los", "y", "e", "o", "u",
    "a", "en", "con", "por", "para", "sin", "sobre", "entre", "ante",
  ]);
  return str.trim().toLowerCase().replace(/\b\w+/g, (word, offset) => {
    if (offset > 0 && LOWERCASE_WORDS.has(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}

async function normalizeOrderNames() {
  try {
    const { pool } = await import("./config/database.js");
    const { rows } = await pool.query(`SELECT id, name FROM orders WHERE name IS NOT NULL AND name != ''`);
    let updated = 0;
    for (const row of rows) {
      const normalized = toTitleCaseEs(row.name);
      if (normalized !== row.name) {
        await pool.query(`UPDATE orders SET name = $1 WHERE id = $2`, [normalized, row.id]);
        updated++;
      }
    }
    if (updated > 0) console.log(`✓ ${updated} nombre(s) de pedidos normalizados a Title Case (ES).`);
  } catch (err) {
    console.warn("⚠ No se pudo normalizar nombres de pedidos:", err.message);
  }
}

async function normalizeCustomerNames() {
  try {
    const { pool } = await import("./config/database.js");
    const { rows } = await pool.query(`SELECT id, name FROM customers WHERE name IS NOT NULL`);
    let updated = 0;
    for (const row of rows) {
      const normalized = toTitleCaseEs(row.name);
      if (normalized !== row.name) {
        await pool.query(`UPDATE customers SET name = $1 WHERE id = $2`, [normalized, row.id]);
        updated++;
      }
    }
    if (updated > 0) console.log(`✓ ${updated} nombre(s) de clientes normalizados a Title Case (ES).`);
  } catch (err) {
    console.warn("⚠ No se pudo normalizar nombres de clientes:", err.message);
  }
}

async function start() {
  try {
    await testConnection();
    await runMigrations();
    await ensureOrderNameColumn();
    await normalizeOrderNames();
    await normalizeCustomerNames();

    // Redis es opcional — si falla el servidor sigue funcionando sin SSE en tiempo real
    try {
      await connectRedis();
      const { initSSESubscriber } = await import("./utils/sseManager.js");
      initSSESubscriber();
    } catch (redisErr) {
      console.warn("Redis no disponible, SSE desactivado temporalmente:", redisErr.message);
    }

    const server = http.createServer(app);

    server.listen(config.port, () => {
      console.log(`APP NTRL API corriendo en puerto ${config.port} [${config.nodeEnv}]`);
    });

    // Auto-ping para evitar cold starts en Render free tier (cada 9 min)
    if (config.nodeEnv === "production") {
      const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${config.port}`;
      setInterval(() => {
        http.get(`${selfUrl}/api/health`, (res) => res.resume()).on("error", () => {});
      }, 9 * 60 * 1000);
    }

    // Graceful shutdown
    function shutdown(signal) {
      console.log(`${signal} recibido. Cerrando servidor...`);
      server.close(() => {
        console.log("Servidor cerrado.");
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));

  } catch (err) {
    console.error("Error al iniciar el servidor:", err);
    process.exit(1);
  }
}

start();
