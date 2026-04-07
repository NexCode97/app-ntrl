import Joi from "joi";

export const createUserSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  role:     Joi.string().valid("admin", "worker", "vendedor").required(),
  area:     Joi.string().valid("corte", "diseno", "impresion", "sublimacion", "ensamble", "terminados").when("role", {
    is: "worker", then: Joi.required(), otherwise: Joi.optional().allow(null),
  }),
}).unknown(true);

export const updateUserSchema = Joi.object({
  name:     Joi.string().min(2).max(100).optional(),
  email:    Joi.string().email().optional(),
  password: Joi.string().min(8).max(100).optional().allow(""),
  area:     Joi.string().valid("corte", "diseno", "impresion", "sublimacion", "ensamble", "terminados").optional().allow(null),
  is_active: Joi.boolean().optional(),
}).unknown(true);
