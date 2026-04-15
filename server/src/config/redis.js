import Redis from "ioredis";
import { config } from "./index.js";

function createClient(name) {
  const client = new Redis(config.redis.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 10) return null; // dejar de reintentar después de 10 intentos
      return Math.min(times * 500, 10000);
    },
    enableOfflineQueue: false, // no acumular comandos cuando Redis está caído
  });

  client.on("connect",      () => console.log(`Redis [${name}] conectado`));
  client.on("error",        (err) => console.error(`Redis [${name}] error:`, err.message));
  client.on("reconnecting", () => console.warn(`Redis [${name}] reconectando...`));

  return client;
}

// Cliente principal — operaciones de lectura/escritura
export const redis = createClient("main");

// Cliente dedicado para publicar mensajes SSE
export const redisPub = createClient("pub");

// Cliente dedicado para suscribirse a mensajes SSE
export const redisSub = createClient("sub");

export async function connectRedis() {
  await Promise.all([redis.connect(), redisPub.connect(), redisSub.connect()]);
}
