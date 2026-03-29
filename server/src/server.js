import "dotenv/config";
import http from "http";
import app from "./app.js";
import { config } from "./config/index.js";
import { testConnection } from "./config/database.js";
import { connectRedis } from "./config/redis.js";

async function start() {
  try {
    await testConnection();
    await connectRedis();

    const { initSSESubscriber } = await import("./utils/sseManager.js");
    initSSESubscriber();

    const server = http.createServer(app);

    server.listen(config.port, () => {
      console.log(`APP NTRL API corriendo en puerto ${config.port} [${config.nodeEnv}]`);
    });

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
