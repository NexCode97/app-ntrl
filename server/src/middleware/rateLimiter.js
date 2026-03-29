import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "error", code: "RATE_LIMITED", message },
    skipSuccessfulRequests: false,
  });
}

// Login: 5 intentos cada 15 minutos por IP
export const strictLimiter = createLimiter({
  ...config.rateLimit.strict,
  message: "Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.",
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
