import Joi from "joi";

const schema = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  sort:   Joi.string().max(50).default("created_at"),
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
