/**
 * Request Logging Middleware
 * Logs incoming requests for debugging and monitoring
 */
function requestLogger(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
}

/**
 * Error Handling Middleware
 * Catches and formats errors
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

module.exports = {
  requestLogger,
  errorHandler,
};
