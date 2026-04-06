function errorHandler(err, req, res, next) {
  console.error('[Server Error]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

export default errorHandler;
