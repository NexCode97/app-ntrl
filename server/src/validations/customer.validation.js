import Joi from "joi";

export const customerSchema = Joi.object({
  name:            Joi.string().min(2).max(200).required(),
  document_type:   Joi.string().valid("nit", "cedula").required(),
  document_number: Joi.string().min(5).max(50).required(),
  is_company:      Joi.boolean().default(false),
  address:         Joi.string().max(300).optional().allow("", null),
  city:            Joi.string().max(100).optional().allow("", null),
  department:      Joi.string().max(100).optional().allow("", null),
  phone:           Joi.string().max(30).optional().allow("", null),
  email:           Joi.string().email().optional().allow("", null),
});
