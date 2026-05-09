import Joi from "joi";

// Whitelist de columnas permitidas para ordenar — evita SQL injection en ORDER BY
const ALLOWED_SORT_COLUMNS = [
  "created_at", "updated_at", "name", "email", "order_number",
  "status", "total", "delivery_date", "payment_number", "amount",
];

const schema = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  sort:   Joi.string().valid(...ALLOWED_SORT_COLUMNS).default("created_at"),
  order:  Joi.string().valid("asc", "desc").default("desc"),
  search: Joi.string().max(200).allow("").optional(),
});

export function pagination(req, res, next) {
  const { error, value } = schema.validate(req.query, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ status: "error", code: "INVALID_PAGINATION", message: error.details[0].message });
  }
  req.pagination = {
    page:   value.page,
    limit:  value.limit,
    offset: (value.page - 1) * value.limit,
    sort:   value.sort,
    order:  value.order,
    search: value.search || null,
  };
  next();
}
