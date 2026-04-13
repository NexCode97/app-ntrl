import Joi from "joi";

export const itemPriceSchema = Joi.object({
  item_id:    Joi.string().uuid().required(),
  unit_price: Joi.number().min(0).required(),
});

export const paymentSchema = Joi.object({
  payment_number: Joi.number().integer().min(1).required(),
  amount:         Joi.number().positive().required(),
  method:         Joi.string().valid("efectivo", "transferencia", "link_bold").required(),
  bank:           Joi.string().valid("Bancolombia", "Nequi", "Davivienda", "Bold").when("method", {
    is: "transferencia", then: Joi.required(), otherwise: Joi.optional().allow(null),
  }),
  paid_at:        Joi.date().iso().optional(),
});
