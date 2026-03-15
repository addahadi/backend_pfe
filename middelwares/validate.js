export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      console.log('Validation Error: ', result.error.issues);
      return res.status(400).json({
        error: 'Validation Error',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    if (property !== 'query') {
      req[property] = result.data;
    }
    next();
  };
};
