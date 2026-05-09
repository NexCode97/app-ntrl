import Joi from "joi";

// Contraseña: mín 8 chars, al menos 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial
const passwordRule = Joi.string()
  .min(8)
  .max(100)
  .pattern(/[A-Z]/, "una mayúscula")
  .pattern(/[a-z]/, "una minúscula")
  .pattern(/[0-9]/, "un número")
  .pattern(/[^A-Za-z0-9]/, "un carácter especial")
  .messages({
    "string.min":     "La contraseña debe tener al menos 8 caracteres.",
    "string.pattern.name": "La contraseña debe incluir {#name}.",
  });

export const createUserSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().required(),
  password: passwordRule.required(),
  role:     Joi.string().valid("admin", "worker", "vendedor").required(),
  area:     Joi.string().valid("corte", "diseno", "impresion", "sublimacion", "ensamble", "terminados").when("role", {
    is: "worker", then: Joi.required(), otherwise: Joi.optional().allow(null),
  }),
}).unknown(true);

export const updateUserSchema = Joi.object({
  name:      Joi.string().min(2).max(100).optional(),
  email:     Joi.string().email().optional(),
  password:  passwordRule.optional().allow(""),
  role:      Joi.string().valid("admin", "worker", "vendedor").optional(),
  area:      Joi.string().valid("corte", "diseno", "impresion", "sublimacion", "ensamble", "terminados").optional().allow(null),
  is_active: Joi.boolean().optional(),
}).unknown(true);
