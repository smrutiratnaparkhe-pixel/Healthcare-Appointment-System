const ApiResponse = require('../utils/apiResponse');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Operational errors
  if (err.isOperational) {
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return ApiResponse.conflict(res, 'Duplicate entry. Resource already exists.');
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return ApiResponse.badRequest(res, 'Referenced resource not found.');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ApiResponse.badRequest(res, 'File size exceeds the allowed limit.');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return ApiResponse.badRequest(res, 'Unexpected file field.');
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;

  return ApiResponse.error(res, message, statusCode);
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

module.exports = { errorHandler, notFoundHandler };
