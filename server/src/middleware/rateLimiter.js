import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

function createLimiter({ windowMs, max, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "error", code: "RATE_LIMITED", message },
    skipSuccessfulRequests,
  });
}

// Login: solo cuenta intentos FALLIDOS
export const strictLimiter = createLimiter({
  ...config.rateLimit.strict,
  message: "Demasiados intentos fallidos. Espera 15 minutos antes de intentar de nuevo.",
  skipSuccessfulRequests: true,
});

// API general: 60 peticiones por minuto
export const moderateLimiter = createLimiter({
  ...config.rateLimit.moderate,
  message: "Demasiadas peticiones. Intenta de nuevo en un momento.",
});

// Lectura de datos: 200 peticiones por minuto
export const permissiveLimiter = createLimiter({
  ...config.rateLimit.permissive,
  message: "Demasiadas peticiones de lectura.",
});
