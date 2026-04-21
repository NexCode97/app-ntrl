import "dotenv/config";

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),

  database: {
    url: process.env.DATABASE_URL,
    poolMin: 2,
    poolMax: 10,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: "15m",
    refreshExpiresIn: "7d",
  },

  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
      .split(",")
      .map((o) => o.trim()),
  },

  upload: {
    dir: process.env.UPLOAD_DIR || "./data/uploads",
    maxSizeMB: 10,
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  },

  google: {
    clientId:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:  process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback",
    clientUrl:    process.env.CLIENT_URL || "http://localhost:5173",
  },

  rateLimit: {
    strict:     { windowMs: 15 * 60 * 1000, max: 5   }, // Login: 5/15min
    moderate:   { windowMs:      60 * 1000, max: 60  }, // API general: 60/min
    permissive: { windowMs:      60 * 1000, max: 200 }, // Lectura: 200/min
  },
};

// Validar variables críticas al arrancar
const required = ["DATABASE_URL", "REDIS_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Variable de entorno requerida no definida: ${key}`);
  }
}

// Validar fortaleza mínima de secretos JWT (≥ 32 chars)
const MIN_SECRET_LEN = 32;
for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
  if (process.env[key].length < MIN_SECRET_LEN) {
    throw new Error(
      `${key} es muy corto (${process.env[key].length} chars). ` +
      `Mínimo ${MIN_SECRET_LEN} chars. Genera uno con: openssl rand -hex 48`
    );
  }
}
