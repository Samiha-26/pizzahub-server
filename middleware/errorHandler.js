export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method,
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist on PizzaHub Server`,
  });
}

export function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the PizzaHub API',
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
