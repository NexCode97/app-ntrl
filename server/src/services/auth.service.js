import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../config/database.js";
import { redis } from "../config/redis.js";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";

export async function login(email, password, ipAddress, userAgent) {
  // Buscar usuario activo
  const { rows } = await pool.query(
    "SELECT id, name, email, role, area, password_hash FROM users WHERE email = $1 AND is_active = true",
    [email]
  );

  const user = rows[0];
  if (!user) throw new AppError("Credenciales incorrectas.", 401, "INVALID_CREDENTIALS");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError("Credenciales incorrectas.", 401, "INVALID_CREDENTIALS");

  // Generar tokens
  const accessToken  = generateAccessToken(user);
  const refreshToken = uuidv4();
  const refreshHash  = await bcrypt.hash(refreshToken, 10);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  // Guardar sesión (el trigger T7 elimina la más antigua si hay >= 3)
  await pool.query(
    `INSERT INTO sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, refreshHash, ipAddress, userAgent, expiresAt]
  );

  return {
    user:         { id: user.id, name: user.name, email: user.email, role: user.role, area: user.area },
    accessToken,
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
}

export async function refreshAccessToken(refreshToken, cookieToken) {
  const tokenToVerify = refreshToken || cookieToken;
  if (!tokenToVerify) throw new AppError("Refresh token requerido.", 401, "UNAUTHORIZED");

  // Buscar sesiones activas y verificar hash
  const { rows } = await pool.query(
    `SELECT s.id, s.refresh_token_hash, s.expires_at,
            u.id as user_id, u.name, u.email, u.role, u.area
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE u.is_active = true AND s.expires_at > NOW()`,
  );

  let session = null;
  for (const row of rows) {
    const match = await bcrypt.compare(tokenToVerify, row.refresh_token_hash);
    if (match) { session = row; break; }
  }

  if (!session) throw new AppError("Sesión inválida o expirada.", 401, "SESSION_EXPIRED");

  // Actualizar last_active
  await pool.query("UPDATE sessions SET last_active_at = NOW() WHERE id = $1", [session.id]);

  const accessToken = generateAccessToken(session);
  return { accessToken };
}

export async function logout(accessToken, refreshToken) {
  // Revocar access token en Redis hasta que expire
  try {
    const payload = jwt.decode(accessToken);
    if (payload?.exp) {
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) await redis.setex(`revoked:${accessToken}`, ttl, "1");
    }
  } catch { /* token inválido, ignorar */ }

  // Eliminar sesión
  if (refreshToken) {
    const { rows } = await pool.query("SELECT id, refresh_token_hash FROM sessions");
    for (const row of rows) {
      const match = await bcrypt.compare(refreshToken, row.refresh_token_hash);
      if (match) {
        await pool.query("DELETE FROM sessions WHERE id = $1", [row.id]);
        break;
      }
    }
  }
}

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.user_id || user.id, role: user.role, area: user.area },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

// Crear access + refresh tokens para un usuario ya autenticado (usado por Google OAuth)
export async function createTokens(user, ipAddress, userAgent) {
  const accessToken  = generateAccessToken(user);
  const refreshToken = uuidv4();
  const refreshHash  = await bcrypt.hash(refreshToken, 10);
  const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, refreshHash, ipAddress, userAgent, expiresAt]
  );

  return { accessToken, refreshToken };
}
