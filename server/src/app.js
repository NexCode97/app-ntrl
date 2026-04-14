import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import passport from "passport";
import { security } from "./middleware/security.js";
import { errorHandler } from "./middleware/errorHandler.js";
import apiRouter from "./routes/index.js";
import { config } from "./config/index.js";
import "./controllers/google.auth.controller.js"; // registra la estrategia Google en passport

const app = express();

// ── Trust proxy (Render usa load balancer con X-Forwarded-For) ─
app.set("trust proxy", 1);

// ── Logging estructurado ──────────────────────────────────────
app.use(pinoHttp({ level: config.nodeEnv === "production" ? "info" : "debug" }));

// ── Seguridad (Helmet + CSP) ──────────────────────────────────
app.use(security);

// ── CORS explícito ────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Permitir sin origin (Postman, apps internas)
    if (!origin || config.cors.allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Parsers ───────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

// ── Passport (OAuth) ──────────────────────────────────────────
app.use(passport.initialize());

// ── Archivos estáticos (diseños de pedidos) ───────────────────
// Permite embeber archivos en iframe desde el mismo origen (para vista previa de PDFs)
app.use("/uploads", (req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
  next();
}, express.static(path.resolve(config.upload.dir)));

// ── Rutas ─────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ── Error handler (debe ir al final) ─────────────────────────
app.use(errorHandler);

export default app;
