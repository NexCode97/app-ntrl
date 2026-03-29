import { AppError } from "../utils/AppError.js";

export function errorHandler(err, req, res, next) {
  // Error de validación Joi
  if (err.isJoi) {
    return res.status(400).json({
      status: "error",
      code: "VALIDATION_ERROR",
      message: err.details[0].message,
    });
  }

  // Error operacional conocido
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: "error",
      code: err.code || "APP_ERROR",
      message: err.message,
    });
  }

  // Error de PostgreSQL — violación de UNIQUE
  if (err.code === "23505") {
    return res.status(409).json({
      status: "error",
      code: "DUPLICATE_ENTRY",
      message: "Ya existe un registro con esos datos.",
    });
  }

  // Error inesperado — no exponer detalles en producción
  console.error("Error no manejado:", err);
  return res.status(500).json({
    status: "error",
    code: "INTERNAL_ERROR",
    message: "Error interno del servidor.",
  });
}
