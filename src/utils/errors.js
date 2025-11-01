/* eslint-disable max-classes-per-file */
/**
 * Custom error classes
 */

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class GitLabAPIError extends AppError {
  constructor(message, statusCode = 500) {
    super(message, statusCode);
    this.name = 'GitLabAPIError';
  }
}

class DifyAPIError extends AppError {
  constructor(message, statusCode = 500) {
    super(message, statusCode);
    this.name = 'DifyAPIError';
  }
}

class ReviewError extends AppError {
  constructor(message, statusCode = 500) {
    super(message, statusCode);
    this.name = 'ReviewError';
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

module.exports = {
  AppError,
  GitLabAPIError,
  DifyAPIError,
  ReviewError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
};
