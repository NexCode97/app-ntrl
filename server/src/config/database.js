import pg from "pg";
import { config } from "./index.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.url,
  min: 0,
  max: config.database.poolMax,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Error inesperado en cliente PostgreSQL inactivo:", err);
});

export async function testConnection() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT NOW() AS now");
    console.log("PostgreSQL conectado:", rows[0].now);
  } finally {
    client.release();
  }
}
