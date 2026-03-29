import bcrypt from "bcryptjs";
import * as authService from "../services/auth.service.js";
import { config } from "../config/index.js";
import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { saveFile, deleteFile } from "../utils/fileStorage.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   config.nodeEnv === "production",
  sameSite: config.nodeEnv === "production" ? "none" : "strict",
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 días
  path:     "/api/auth/refresh",
};

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress  = req.ip;
    const userAgent  = req.headers["user-agent"] || "";

    const result = await authService.login(email, password, ipAddress, userAgent);

    // Refresh token en httpOnly cookie — no expuesto al JS
    res.cookie("ntrl_refresh", result.refreshToken, COOKIE_OPTIONS);

    res.json({
      status: "ok",
      user:        result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const cookieToken = req.cookies?.ntrl_refresh;
    const { accessToken } = await authService.refreshAccessToken(null, cookieToken);
    res.json({ status: "ok", accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const refreshToken = req.cookies?.ntrl_refresh;

    await authService.logout(accessToken, refreshToken);

    res.clearCookie("ntrl_refresh", { path: "/api/auth/refresh" });
    res.json({ status: "ok", message: "Sesión cerrada." });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const { rows: [user] } = await pool.query(
      "SELECT id, name, email, role, area, avatar FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({ status: "ok", user });
  } catch (err) { next(err); }
}

export async function updateMe(req, res, next) {
  try {
    const { name, email, current_password, new_password } = req.body;
    const sets = [];
    const vals = [req.user.id];

    if (name?.trim()) {
      vals.push(name.trim());
      sets.push(`name = $${vals.length}`);
    }

    if (email?.trim()) {
      const lower = email.trim().toLowerCase();
      const { rows } = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND id <> $2",
        [lower, req.user.id]
      );
      if (rows.length) throw new AppError("Ese correo ya está en uso.", 409, "EMAIL_IN_USE");
      vals.push(lower);
      sets.push(`email = $${vals.length}`);
    }

    if (new_password) {
      if (!current_password) throw new AppError("Debes ingresar tu contraseña actual.", 400, "MISSING_CURRENT_PASSWORD");
      const { rows: [u] } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
      const ok = await bcrypt.compare(current_password, u.password_hash);
      if (!ok) throw new AppError("La contraseña actual es incorrecta.", 401, "WRONG_PASSWORD");
      vals.push(await bcrypt.hash(new_password, 12));
      sets.push(`password_hash = $${vals.length}`);
    }

    if (!sets.length) throw new AppError("Nada que actualizar.", 400, "EMPTY_UPDATE");

    const { rows: [updated] } = await pool.query(
      `UPDATE users SET ${sets.join(", ")}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, area, avatar`,
      vals
    );

    res.json({ status: "ok", user: updated });
  } catch (err) { next(err); }
}

export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) throw new AppError("No se recibió ningún archivo.", 400, "NO_FILE");

    // Eliminar avatar anterior si existe
    const { rows: [u] } = await pool.query("SELECT avatar FROM users WHERE id = $1", [req.user.id]);
    if (u?.avatar) await deleteFile(u.avatar);

    const avatarPath = await saveFile(req.file, "avatars");

    const { rows: [updated] } = await pool.query(
      "UPDATE users SET avatar = $2, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, area, avatar",
      [req.user.id, avatarPath]
    );

    res.json({ status: "ok", user: updated });
  } catch (err) { next(err); }
}

export async function deleteAvatar(req, res, next) {
  try {
    const { rows: [u] } = await pool.query("SELECT avatar FROM users WHERE id = $1", [req.user.id]);
    if (u?.avatar) await deleteFile(u.avatar);

    const { rows: [updated] } = await pool.query(
      "UPDATE users SET avatar = NULL, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, area, avatar",
      [req.user.id]
    );

    res.json({ status: "ok", user: updated });
  } catch (err) { next(err); }
}
