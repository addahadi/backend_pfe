export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      return next(result.error);
    }
    if (property !== 'query') {
      req[property] = result.data;
    }
    next();
  };
};
