/**
 * Script de inicialización del primer administrador.
 * Ejecutar UNA sola vez después del primer deploy:
 *   node src/scripts/initAdmin.js
 */

import "dotenv/config";
import { createInterface } from "readline";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log("\n=== APP NTRL — Crear primer administrador ===\n");

  const name     = await ask("Nombre completo: ");
  const email    = await ask("Correo electrónico: ");
  const password = await ask("Contraseña (min. 8 caracteres): ");

  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, role, password_hash)
     VALUES ($1, $2, 'admin', $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, name, email`,
    [name.trim(), email.trim().toLowerCase(), hash]
  );

  if (rows.length === 0) {
    console.log("\nYa existe un usuario con ese correo.");
  } else {
    console.log(`\nAdministrador creado: ${rows[0].name} <${rows[0].email}> (id: ${rows[0].id})`);
  }

  rl.close();
  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
