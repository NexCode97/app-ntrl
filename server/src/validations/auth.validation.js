import Joi from "joi";

export const loginSchema = Joi.object({
  email:    Joi.string().email().required().messages({
    "string.email": "El correo no es válido.",
    "any.required": "El correo es requerido.",
  }),
  password: Joi.string().min(6).max(100).required().messages({
    "string.min": "La contraseña debe tener al menos 6 caracteres.",
    "any.required": "La contraseña es requerida.",
  }),
});
