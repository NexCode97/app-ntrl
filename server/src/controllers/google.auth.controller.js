import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { pool } from "../config/database.js";
import { config } from "../config/index.js";
import * as authService from "../services/auth.service.js";

// Configurar estrategia Google
passport.use(new GoogleStrategy(
  {
    clientID:     config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL:  config.google.callbackUrl,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      const name  = profile.displayName;
      const avatar = profile.photos?.[0]?.value;

      if (!email) return done(new Error("No se pudo obtener el correo de Google."));

      // Buscar usuario por email
      const { rows: [user] } = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (!user) {
        // Usuario no registrado en el sistema
        return done(null, false, { message: "Tu cuenta de Google no está registrada en APP NTRL. Contacta al administrador." });
      }

      if (!user.is_active) {
        return done(null, false, { message: "Tu cuenta está desactivada." });
      }

      // Actualizar nombre y avatar desde Google si no tiene
      const updates = [];
      const vals = [user.id];
      if (!user.avatar && avatar) {
        vals.push(avatar); updates.push(`avatar = $${vals.length}`);
      }
      if (updates.length) {
        await pool.query(
          `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1`,
          vals
        );
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Iniciar flujo OAuth
export function googleLogin(req, res, next) {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
}

// Callback — Google redirige aquí
export async function googleCallback(req, res, next) {
  passport.authenticate("google", { session: false }, async (err, user, info) => {
    if (err)   return res.redirect(`${config.google.clientUrl}/login?error=server`);
    if (!user) {
      const msg = encodeURIComponent(info?.message || "No autorizado");
      return res.redirect(`${config.google.clientUrl}/login?error=${msg}`);
    }

    try {
      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"] || "";

      // Crear tokens igual que en el login normal
      const { accessToken, refreshToken } = await authService.createTokens(user, ipAddress, userAgent);

      // Refresh token en cookie httpOnly
      res.cookie("ntrl_refresh", refreshToken, {
        httpOnly: true,
        secure:   config.nodeEnv === "production",
        sameSite: "strict",
        maxAge:   7 * 24 * 60 * 60 * 1000,
        path:     "/api/auth/refresh",
      });

      // Redirigir al frontend con el access token en query param (temporal, se guarda en memoria)
      res.redirect(`${config.google.clientUrl}/auth/callback?token=${accessToken}`);
    } catch (e) {
      next(e);
    }
  })(req, res, next);
}
