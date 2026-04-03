import Joi from "joi";

const sizeQuantities = Joi.object().pattern(
  Joi.string().valid("T2","T4","T6","T8","T10","T12","T14","T16","TXS","TS","TM","TL","TXL","T2XL","T3XL"),
  Joi.number().integer().min(0)
);

export const orderItemSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
  gender:     Joi.string().valid("nino", "hombre", "mujer", "unisex").required(),
  sizes:      sizeQuantities.required(),
  unit_price: Joi.number().min(0).default(0),
});

export const createOrderSchema = Joi.object({
  customer_id:   Joi.string().uuid().required(),
  delivery_date: Joi.date().iso().optional().allow(null),
  description:   Joi.string().max(1000).optional().allow("", null),
  items:         Joi.array().items(orderItemSchema).min(1).required(),
});

export const updateOrderSchema = Joi.object({
  customer_id:        Joi.string().uuid().optional(),
  delivery_date:      Joi.date().iso().optional().allow(null, ""),
  description:        Joi.string().max(1000).optional().allow("", null),
  status:             Joi.string().valid("delivered").optional(),
  items:              Joi.array().items(orderItemSchema).min(1).optional(),
  design_files_keep:  Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.object())).optional(),
});
