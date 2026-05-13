const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  // Default error
  let error = { ...err };
  error.message = err.message;

  // Validation error
  if (err.name === 'ValidationError') {
    const message = 'Validation Error';
    error = {
      statusCode: 400,
      message,
      errors: Object.values(err.errors).map(val => ({
        field: val.path,
        message: val.message
      }))
    };
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      statusCode: 401,
      message
    };
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      statusCode: 401,
      message
    };
  }

  // Proxy errors
  if (err.code === 'ECONNREFUSED') {
    const message = 'Service temporarily unavailable. Please try again later.';
    error = {
      statusCode: 503,
      message
    };
  }

  // Connection timeout errors
  if (err.code === 'ETIMEDOUT') {
    const message = 'Service request timed out. Please try again later.';
    error = {
      statusCode: 504,
      message
    };
  }

  // Host not found errors
  if (err.code === 'ENOTFOUND') {
    const message = 'Service not found. Please contact support.';
    error = {
      statusCode: 503,
      message
    };
  }

  // Connection reset errors
  if (err.code === 'ECONNRESET') {
    const message = 'Connection was reset. Please try again.';
    error = {
      statusCode: 503,
      message
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(error.errors && { errors: error.errors })
  });
};

module.exports = { errorHandler };
