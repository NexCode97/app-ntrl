import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../../../migrations");

export async function runMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.log("Carpeta migrations no encontrada — omitiendo migraciones.");
    return;
  }
  const client = await pool.connect();
  try {
    // Crear tabla de control si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id      SERIAL PRIMARY KEY,
        name    VARCHAR(255) UNIQUE NOT NULL,
        run_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Leer archivos .sql ordenados
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        "SELECT id FROM _migrations WHERE name = $1",
        [file]
      );
      if (rows.length > 0) {
        console.log(`Migración ya aplicada: ${file}`);
        continue;
      }

      console.log(`Aplicando migración: ${file}`);
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      console.log(`Migración completada: ${file}`);
    }

    console.log("Migraciones finalizadas.");
  } finally {
    client.release();
  }
}
