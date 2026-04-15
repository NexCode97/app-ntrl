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

async function start() {
  try {
    await testConnection();
    await runMigrations();

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
