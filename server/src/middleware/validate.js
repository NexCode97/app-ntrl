export function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: true, stripUnknown: true });
    if (error) return next(error);
    req[property] = value;
    next();
  };
}
