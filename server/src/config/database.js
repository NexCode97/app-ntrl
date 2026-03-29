import pg from "pg";
import { config } from "./index.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.url,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
