/**
 * Error handling middleware
 */
const { StatusCodes } = require('http-status-codes');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let errors = null;

  // Operational errors (known errors)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Validation errors
  else if (err.name === 'ValidationError') {
    statusCode = StatusCodes.BAD_REQUEST;
    message = 'Validation error';
    errors = err.errors;
  }
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = 'Invalid token';
  }
  // Unknown errors
  else if (!err.isOperational) {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error', {
      statusCode,
      message,
      url: req.url,
      method: req.method,
      error: err.message,
      stack: err.stack,
    });
  } else {
    logger.warn('Client error', {
      statusCode,
      message,
      url: req.url,
      method: req.method,
    });
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
  });

  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: 'Route not found',
    path: req.url,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
